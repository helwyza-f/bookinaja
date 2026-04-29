package midtrans

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type Repository struct {
	db *sqlx.DB
}

func NewRepository(db *sqlx.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) CreateBookingEvent(ctx context.Context, exec sqlx.ExtContext, booking BookingNotificationContext, actorType, eventType, title, description string, metadata map[string]any) error {
	raw, _ := json.Marshal(metadata)
	if len(raw) == 0 {
		raw = []byte(`{}`)
	}
	_, err := exec.ExecContext(ctx, `
		INSERT INTO booking_events (
			id, booking_id, tenant_id, customer_id, actor_type, event_type, title, description, metadata, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()
		)`,
		uuid.New(), booking.BookingID, booking.TenantID, booking.CustomerID, actorType, eventType, title, description, raw,
	)
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
			$1, $2, $3, $4, 'earn', $5, 'Earned from booking payment', jsonb_build_object('paid_amount', $6), NOW()
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
