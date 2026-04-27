package billing

import (
	"context"
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


