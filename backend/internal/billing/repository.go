package billing

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/helwiza/backend/internal/platform/midtrans"
	"github.com/jmoiron/sqlx"
)

type Repository struct {
	db *sqlx.DB
}

func NewRepository(db *sqlx.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) CreateOrder(ctx context.Context, exec sqlx.ExtContext, order BillingOrder) error {
	_, err := exec.ExecContext(ctx, `
		INSERT INTO billing_orders (
			tenant_id, order_id, plan, billing_interval, amount, currency, status, midtrans_raw, updated_at
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,$8,NOW()
		)`,
		order.TenantID, order.OrderID, order.Plan, order.BillingInterval, order.Amount, order.Currency, order.Status, order.MidtransRaw,
	)
	return err
}

func (r *Repository) UpdateOrderFromMidtrans(ctx context.Context, exec sqlx.ExtContext, orderID string, status string, transactionID *string, paymentType *string, raw map[string]any) (midtrans.SubscriptionOrder, error) {
	rawBytes, _ := json.Marshal(raw)

	var updated midtrans.SubscriptionOrder
	err := sqlx.GetContext(ctx, exec, &updated, `
		UPDATE billing_orders
		SET status = $2,
			midtrans_transaction_id = COALESCE($3, midtrans_transaction_id),
			midtrans_payment_type = COALESCE($4, midtrans_payment_type),
			midtrans_raw = $5,
			updated_at = NOW()
		WHERE order_id = $1
		RETURNING *`,
		orderID, status, transactionID, paymentType, rawBytes,
	)
	return updated, err
}

func (r *Repository) GetOrderByOrderID(ctx context.Context, orderID string) (BillingOrder, error) {
	var o BillingOrder
	err := r.db.GetContext(ctx, &o, `SELECT * FROM billing_orders WHERE order_id = $1 LIMIT 1`, orderID)
	return o, err
}

func (r *Repository) ListOrdersByTenant(ctx context.Context, tenantID uuid.UUID, limit int) ([]BillingOrder, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	var orders []BillingOrder
	err := r.db.SelectContext(ctx, &orders, `
		SELECT *
		FROM billing_orders
		WHERE tenant_id = $1
		ORDER BY created_at DESC
		LIMIT $2`,
		tenantID, limit,
	)
	return orders, err
}

func (r *Repository) GetSubscriptionInfo(ctx context.Context, tenantID uuid.UUID) (SubscriptionInfo, error) {
	var info SubscriptionInfo
	info.TenantID = tenantID

	type row struct {
		Plan   string     `db:"plan"`
		Status string     `db:"subscription_status"`
		Start  *time.Time `db:"subscription_current_period_start"`
		End    *time.Time `db:"subscription_current_period_end"`
	}
	var rrow row
	err := r.db.GetContext(ctx, &rrow, `
		SELECT plan, subscription_status, subscription_current_period_start, subscription_current_period_end
		FROM tenants
		WHERE id = $1
		LIMIT 1`, tenantID,
	)
	if err != nil {
		return SubscriptionInfo{}, err
	}
	info.Plan = rrow.Plan
	info.Status = rrow.Status
	info.CurrentPeriodStart = rrow.Start
	info.CurrentPeriodEnd = rrow.End
	return info, nil
}

func (r *Repository) ActivateSubscription(ctx context.Context, tenantID uuid.UUID, plan string, start time.Time, end time.Time) error {
	_, err := r.db.ExecContext(ctx, `
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

func (r *Repository) GetBookingForPayment(ctx context.Context, exec sqlx.ExtContext, bookingID uuid.UUID, tenantID uuid.UUID) (BookingPaymentSnapshot, error) {
	var booking BookingPaymentSnapshot
	err := sqlx.GetContext(ctx, exec, &booking, `
		SELECT id, tenant_id, grand_total, deposit_amount, paid_amount, balance_due, payment_status, status
		FROM bookings
		WHERE id = $1 AND tenant_id = $2
		LIMIT 1`,
		bookingID, tenantID,
	)
	return booking, err
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
				WHEN $2 = 'paid' OR $2 = 'settled' THEN 0
				WHEN $2 = 'partial_paid' THEN GREATEST(grand_total - deposit_amount, 0)
				ELSE balance_due
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
			END
		WHERE id = $1`,
		bookingID, status, paymentType,
	)
	return err
}

func (r *Repository) GetBookingNotificationContext(ctx context.Context, exec sqlx.ExtContext, bookingID uuid.UUID) (midtrans.BookingNotificationContext, error) {
	var ctxData midtrans.BookingNotificationContext
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

func (r *Repository) CreateMidtransNotificationLog(ctx context.Context, exec sqlx.ExtContext, log midtrans.MidtransNotificationLog) error {
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

func (r *Repository) CreateLedgerEntry(ctx context.Context, exec sqlx.ExtContext, entry midtrans.TenantLedgerEntry) error {
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
