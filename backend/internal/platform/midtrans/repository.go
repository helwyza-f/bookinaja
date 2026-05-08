package midtrans

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/redis/go-redis/v9"
)

type Repository struct {
	db  *sqlx.DB
	rdb *redis.Client
}

type BookingPaymentAttempt struct {
	ID         uuid.UUID `db:"id"`
	MethodCode string    `db:"method_code"`
}

func NewRepository(db *sqlx.DB, rdb ...*redis.Client) *Repository {
	var client *redis.Client
	if len(rdb) > 0 {
		client = rdb[0]
	}
	return &Repository{db: db, rdb: client}
}

func (r *Repository) invalidateTenantCache(ctx context.Context, exec sqlx.ExtContext, tenantID uuid.UUID) {
	if r.rdb == nil {
		return
	}
	var slug string
	if err := sqlx.GetContext(ctx, exec, &slug, `SELECT slug FROM tenants WHERE id = $1 LIMIT 1`, tenantID); err != nil {
		return
	}
	slug = strings.ToLower(strings.TrimSpace(slug))
	_ = r.rdb.Del(
		ctx,
		fmt.Sprintf("tenant:profile:id:%s", tenantID.String()),
		fmt.Sprintf("tenant:profile:slug:%s", slug),
		fmt.Sprintf("landing:full:%s", slug),
		fmt.Sprintf("tenant_id_by_slug:%s", slug),
		"tenant:public:list",
	).Err()
}

func (r *Repository) invalidateBookingTenantCache(ctx context.Context, exec sqlx.ExtContext, bookingID uuid.UUID) {
	if r.rdb == nil {
		return
	}
	var tenantID uuid.UUID
	if err := sqlx.GetContext(ctx, exec, &tenantID, `SELECT tenant_id FROM bookings WHERE id = $1 LIMIT 1`, bookingID); err != nil {
		return
	}
	_ = r.rdb.Del(
		ctx,
		fmt.Sprintf("customer:tenant:%s", tenantID.String()),
		fmt.Sprintf("customer:broadcast:%s:active", tenantID.String()),
	).Err()
}

func (r *Repository) invalidateReservationBookingCache(ctx context.Context, exec sqlx.ExtContext, bookingID uuid.UUID) {
	if r.rdb == nil {
		return
	}

	type bookingCacheRow struct {
		ID          uuid.UUID  `db:"id"`
		TenantID    uuid.UUID  `db:"tenant_id"`
		CustomerID  *uuid.UUID `db:"customer_id"`
		AccessToken uuid.UUID  `db:"access_token"`
		Status      string     `db:"status"`
	}

	var row bookingCacheRow
	if err := sqlx.GetContext(ctx, exec, &row, `
		SELECT id, tenant_id, customer_id, access_token, status
		FROM bookings
		WHERE id = $1
		LIMIT 1`, bookingID); err != nil {
		return
	}

	status := strings.ToLower(strings.TrimSpace(row.Status))
	if status == "" {
		status = "all"
	}

	keys := []string{
		fmt.Sprintf("reservation:booking:admin:%s:%s", row.ID.String(), row.TenantID.String()),
		fmt.Sprintf("reservation:booking:active:%s", row.TenantID.String()),
		fmt.Sprintf("reservation:booking:list:%s:all", row.TenantID.String()),
		fmt.Sprintf("reservation:booking:list:%s:%s", row.TenantID.String(), status),
	}
	if row.AccessToken != uuid.Nil {
		keys = append(keys, fmt.Sprintf("reservation:booking:public:%s", row.AccessToken.String()))
	}
	if row.CustomerID != nil && *row.CustomerID != uuid.Nil {
		keys = append(keys, fmt.Sprintf("reservation:booking:customer:%s:%s", row.ID.String(), row.CustomerID.String()))
	}
	_ = r.rdb.Del(ctx, keys...).Err()
}

func (r *Repository) CreateBookingEvent(ctx context.Context, exec sqlx.ExtContext, booking BookingNotificationContext, actorType, eventType, title, description string, metadata map[string]any) error {
	var tableName sql.NullString
	if err := sqlx.GetContext(ctx, exec, &tableName, `SELECT to_regclass('public.booking_events')::text`); err != nil {
		return err
	}
	if !tableName.Valid || strings.TrimSpace(tableName.String) == "" {
		return nil
	}

	raw, _ := json.Marshal(metadata)
	if len(raw) == 0 {
		raw = []byte(`{}`)
	}
	_, _ = exec.ExecContext(ctx, `SAVEPOINT optional_booking_event`)
	_, err := exec.ExecContext(ctx, `
		INSERT INTO booking_events (
			id, booking_id, tenant_id, customer_id, actor_user_id, actor_type, actor_name, actor_email, actor_role, event_type, title, description, metadata, created_at
		) VALUES (
			$1, $2, $3, $4, NULL, $5, '', '', '', $6, $7, $8, $9, NOW()
		)`,
		uuid.New(), booking.BookingID, booking.TenantID, booking.CustomerID, actorType, eventType, title, description, raw,
	)
	if err != nil {
		_, _ = exec.ExecContext(ctx, `ROLLBACK TO SAVEPOINT optional_booking_event`)
		return err
	}
	_, _ = exec.ExecContext(ctx, `RELEASE SAVEPOINT optional_booking_event`)
	return err
}

func (r *Repository) UpdateOrderFromMidtrans(ctx context.Context, exec sqlx.ExtContext, orderID string, status string, transactionID *string, paymentType *string, raw map[string]any) (SubscriptionOrder, error) {
	rawBytes, _ := json.Marshal(raw)

	var updated SubscriptionOrder
	err := sqlx.GetContext(ctx, exec, &updated, `
		UPDATE billing_orders
		SET status = $2,
			midtrans_transaction_id = COALESCE($3, midtrans_transaction_id),
			midtrans_payment_type = COALESCE($4, midtrans_payment_type),
			midtrans_raw = $5,
			updated_at = NOW()
		WHERE order_id = $1
		RETURNING tenant_id, amount, status, plan, billing_interval`,
		orderID, status, transactionID, paymentType, rawBytes,
	)
	return updated, err
}

func (r *Repository) UpdateBookingPaymentFromMidtrans(ctx context.Context, exec sqlx.ExtContext, bookingID uuid.UUID, status string, transactionID *string, paymentType *string, raw map[string]any) error {
	_, err := exec.ExecContext(ctx, `
		UPDATE bookings
		SET payment_status = CASE
				WHEN $2 IN ('paid', 'settled') AND balance_due > 0 THEN 'partial_paid'
				WHEN $2 IN ('paid', 'settled') THEN 'settled'
				ELSE $2
			END,
			status = CASE
				WHEN status = 'pending' AND $2 IN ('paid', 'settled') THEN 'confirmed'
				ELSE status
			END,
			payment_method = COALESCE($3, payment_method),
			paid_amount = CASE
				WHEN $2 IN ('paid', 'settled') AND balance_due > 0 THEN deposit_amount
				WHEN $2 IN ('paid', 'settled') THEN grand_total
				WHEN $2 = 'partial_paid' THEN deposit_amount
				ELSE paid_amount
			END,
			balance_due = CASE
				WHEN $2 IN ('paid', 'settled') AND balance_due > 0 THEN GREATEST(grand_total - deposit_amount, 0)
				WHEN $2 = 'paid' OR $2 = 'settled' THEN 0
				WHEN $2 = 'partial_paid' THEN GREATEST(grand_total - deposit_amount, 0)
				ELSE balance_due
			END,
			settled_at = CASE
				WHEN $2 IN ('paid', 'settled') AND balance_due <= 0 THEN COALESCE(settled_at, NOW())
				ELSE settled_at
			END,
			last_status_changed_at = CASE
				WHEN status = 'pending' AND $2 IN ('paid', 'settled') THEN NOW()
				ELSE last_status_changed_at
			END
		WHERE id = $1`,
		bookingID, status, paymentType,
	)
	if err == nil {
		r.invalidateBookingTenantCache(ctx, exec, bookingID)
		r.invalidateReservationBookingCache(ctx, exec, bookingID)
	}
	return err
}

func (r *Repository) UpdateBookingSettlementFromMidtrans(ctx context.Context, exec sqlx.ExtContext, bookingID uuid.UUID, status string, transactionID *string, paymentType *string, raw map[string]any) error {
	_, err := exec.ExecContext(ctx, `
		UPDATE bookings
		SET payment_status = CASE
				WHEN $2 IN ('paid', 'settled') THEN 'settled'
				ELSE $2
			END,
			status = CASE
				WHEN status IN ('pending', 'confirmed', 'active') AND $2 IN ('paid', 'settled') THEN 'completed'
				ELSE status
			END,
			payment_method = COALESCE($3, payment_method),
			paid_amount = CASE
				WHEN $2 IN ('paid', 'settled') THEN grand_total
				ELSE paid_amount
			END,
			balance_due = CASE
				WHEN $2 IN ('paid', 'settled') THEN 0
				ELSE balance_due
			END,
			settled_at = CASE
				WHEN $2 IN ('paid', 'settled') THEN COALESCE(settled_at, NOW())
				ELSE settled_at
			END,
			completed_at = CASE
				WHEN status IN ('pending', 'confirmed', 'active') AND $2 IN ('paid', 'settled') THEN COALESCE(completed_at, NOW())
				ELSE completed_at
			END,
			last_status_changed_at = CASE
				WHEN status IN ('pending', 'confirmed', 'active') AND $2 IN ('paid', 'settled') THEN NOW()
				ELSE last_status_changed_at
			END
		WHERE id = $1`,
		bookingID, status, paymentType,
	)
	if err == nil {
		r.invalidateBookingTenantCache(ctx, exec, bookingID)
		r.invalidateReservationBookingCache(ctx, exec, bookingID)
	}
	return err
}

func (r *Repository) UpdatePromoRedemptionStatus(ctx context.Context, exec sqlx.ExtContext, bookingID uuid.UUID, status string) error {
	_, err := exec.ExecContext(ctx, `
		UPDATE tenant_promo_redemptions
		SET status = $2,
			redeemed_at = CASE
				WHEN $2 = 'redeemed' THEN NOW()
				ELSE redeemed_at
			END
		WHERE booking_id = $1`,
		bookingID, status,
	)
	return err
}

func (r *Repository) GetBookingNotificationContext(ctx context.Context, exec sqlx.ExtContext, bookingID uuid.UUID) (BookingNotificationContext, error) {
	var ctxData BookingNotificationContext
	err := sqlx.GetContext(ctx, exec, &ctxData, `
		SELECT
			b.id AS booking_id,
			b.tenant_id,
			b.customer_id,
			b.access_token,
			c.name AS customer_name,
			c.phone AS customer_phone,
			t.slug AS tenant_slug,
			res.name AS resource_name,
			b.grand_total,
			b.deposit_amount,
			b.paid_amount,
			b.balance_due,
			b.payment_status,
			b.status
		FROM bookings b
		JOIN customers c ON c.id = b.customer_id
		JOIN tenants t ON t.id = b.tenant_id
		JOIN resources res ON res.id = b.resource_id
		WHERE b.id = $1
		LIMIT 1`,
		bookingID,
	)
	return ctxData, err
}

func (r *Repository) CreateMidtransNotificationLog(ctx context.Context, exec sqlx.ExtContext, log MidtransNotificationLog) error {
	_, err := exec.ExecContext(ctx, `
		INSERT INTO midtrans_notification_logs (
			tenant_id, booking_id, order_id, transaction_id, transaction_status, fraud_status,
			payment_type, gross_amount, signature_valid, processing_status, error_message,
			raw_payload, received_at, processed_at
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,COALESCE($13, NOW()), $14
		)`,
		log.TenantID, log.BookingID, log.OrderID, log.TransactionID, log.TransactionStatus, log.FraudStatus,
		log.PaymentType, log.GrossAmount, log.SignatureValid, log.ProcessingStatus, log.ErrorMessage,
		log.RawPayload, log.ReceivedAt, log.ProcessedAt,
	)
	return err
}

func (r *Repository) CreateMidtransNotificationLogDirect(ctx context.Context, log MidtransNotificationLog) error {
	if r.db == nil {
		return nil
	}
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO midtrans_notification_logs (
			tenant_id, booking_id, order_id, transaction_id, transaction_status, fraud_status,
			payment_type, gross_amount, signature_valid, processing_status, error_message,
			raw_payload, received_at, processed_at
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,COALESCE($13, NOW()), $14
		)`,
		log.TenantID, log.BookingID, log.OrderID, log.TransactionID, log.TransactionStatus, log.FraudStatus,
		log.PaymentType, log.GrossAmount, log.SignatureValid, log.ProcessingStatus, log.ErrorMessage,
		log.RawPayload, log.ReceivedAt, log.ProcessedAt,
	)
	return err
}

func (r *Repository) GetBookingPaymentAttemptByGatewayOrderID(ctx context.Context, exec sqlx.ExtContext, orderID string) (*BookingPaymentAttempt, error) {
	var item BookingPaymentAttempt
	err := sqlx.GetContext(ctx, exec, &item, `
		SELECT id, method_code
		FROM booking_payment_attempts
		WHERE gateway_order_id = $1
		ORDER BY created_at DESC
		LIMIT 1`,
		orderID,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *Repository) MarkBookingPaymentAttemptStatus(ctx context.Context, exec sqlx.ExtContext, attemptID uuid.UUID, status string, transactionID, adminNote *string) error {
	_, err := exec.ExecContext(ctx, `
		UPDATE booking_payment_attempts
		SET status = $2::text,
			gateway_transaction_id = CASE WHEN $3::text IS NOT NULL THEN $3::text ELSE gateway_transaction_id END,
			admin_note = CASE WHEN $4::text IS NOT NULL THEN $4::text ELSE admin_note END,
			verified_at = CASE WHEN $2::text IN ('paid', 'verified', 'settled') THEN COALESCE(verified_at, NOW()) ELSE verified_at END,
			rejected_at = CASE WHEN $2::text = 'rejected' THEN COALESCE(rejected_at, NOW()) ELSE rejected_at END,
			updated_at = NOW()
		WHERE id = $1`,
		attemptID, status, transactionID, adminNote,
	)
	return err
}

func (r *Repository) CreateLedgerEntry(ctx context.Context, exec sqlx.ExtContext, entry TenantLedgerEntry) error {
	_, err := exec.ExecContext(ctx, `
		INSERT INTO tenant_ledger_entries (
			tenant_id, source_type, source_id, source_ref, midtrans_order_id, midtrans_transaction_id,
			transaction_status, payment_type, direction, gross_amount, platform_fee, net_amount,
			balance_after, status, dedupe_key, raw_payload, created_at, updated_at
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,COALESCE($17, NOW()), COALESCE($18, NOW())
		)
		ON CONFLICT (dedupe_key) DO NOTHING`,
		entry.TenantID, entry.SourceType, entry.SourceID, entry.SourceRef, entry.MidtransOrderID, entry.MidtransTransactionID,
		entry.TransactionStatus, entry.PaymentType, entry.Direction, entry.GrossAmount, entry.PlatformFee, entry.NetAmount,
		entry.BalanceAfter, entry.Status, entry.DedupeKey, entry.RawPayload, entry.CreatedAt, entry.UpdatedAt,
	)
	return err
}

func (r *Repository) AwardCustomerBookingPoints(ctx context.Context, exec sqlx.ExtContext, booking BookingNotificationContext, paidAmount int64) error {
	points := paidAmount / 10000
	if points <= 0 {
		return nil
	}

	var insertedID uuid.UUID
	err := sqlx.GetContext(ctx, exec, &insertedID, `
		INSERT INTO customer_point_ledger (
			id, customer_id, tenant_id, booking_id, event_type, points, description, metadata, created_at
		) VALUES (
			$1, $2, $3, $4, 'earn', $5, 'Earned from booking payment', jsonb_build_object('paid_amount', $6::bigint), NOW()
		)
		ON CONFLICT DO NOTHING
		RETURNING id`,
		uuid.New(), booking.CustomerID, booking.TenantID, booking.BookingID, points, paidAmount,
	)
	if err == sql.ErrNoRows {
		return nil
	}
	if err != nil {
		return err
	}

	_, err = exec.ExecContext(ctx, `
		UPDATE customers
		SET loyalty_points = loyalty_points + $2,
			updated_at = NOW()
		WHERE id = $1`,
		booking.CustomerID, points,
	)
	return err
}

func (r *Repository) CurrentTenantBalance(ctx context.Context, exec sqlx.ExtContext, tenantID uuid.UUID) (int64, error) {
	var balance int64
	err := sqlx.GetContext(ctx, exec, &balance, `
		SELECT COALESCE(SUM(CASE WHEN status = 'settled' AND direction = 'credit' THEN net_amount ELSE 0 END), 0)
		     - COALESCE(SUM(CASE WHEN status = 'settled' AND direction = 'debit' THEN net_amount ELSE 0 END), 0) AS balance
		FROM tenant_ledger_entries
		WHERE tenant_id = $1`,
		tenantID,
	)
	return balance, err
}

func (r *Repository) ActivateSubscriptionExec(ctx context.Context, exec sqlx.ExtContext, tenantID uuid.UUID, plan string, start time.Time, end time.Time) error {
	_, err := exec.ExecContext(ctx, `
		UPDATE tenants
		SET plan = $2,
			subscription_status = 'active',
			subscription_current_period_start = $3,
			subscription_current_period_end = $4
		WHERE id = $1`,
		tenantID, plan, start, end,
	)
	if err == nil {
		r.invalidateTenantCache(ctx, exec, tenantID)
	}
	return err
}

func (r *Repository) CreateReferralRewardIfEligible(ctx context.Context, exec sqlx.ExtContext, referredTenantID uuid.UUID, sourceOrderID string) error {
	var referrerID sql.NullString
	err := sqlx.GetContext(ctx, exec, &referrerID, `
		SELECT referred_by_tenant_id
		FROM tenants
		WHERE id = $1
		LIMIT 1`,
		referredTenantID,
	)
	if err != nil {
		return err
	}
	if !referrerID.Valid {
		return nil
	}

	referrerUUID, err := uuid.Parse(referrerID.String)
	if err != nil {
		return err
	}

	_, err = exec.ExecContext(ctx, `
		INSERT INTO referral_rewards (
			referrer_tenant_id, referred_tenant_id, source_order_id, reward_amount, status, available_at, metadata, created_at, updated_at
		) VALUES (
			$1, $2, $3, 100000, 'available', NOW(), jsonb_build_object('source', 'subscription_first_purchase'), NOW(), NOW()
		)
		ON CONFLICT (referred_tenant_id) DO NOTHING`,
		referrerUUID, referredTenantID, sourceOrderID,
	)
	return err
}
