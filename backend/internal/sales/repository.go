package sales

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type Repository struct {
	db *sqlx.DB
}

func NewRepository(db *sqlx.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) CreateOrder(ctx context.Context, order Order) (*Order, error) {
	query := `
		INSERT INTO sales_orders (
			id, tenant_id, customer_id, resource_id, order_number,
			status, subtotal, discount_amount, grand_total, paid_amount,
			balance_due, payment_status, payment_method, notes,
			created_by_user_id, completed_at, created_at, updated_at
		) VALUES (
			:id, :tenant_id, :customer_id, :resource_id, :order_number,
			:status, :subtotal, :discount_amount, :grand_total, :paid_amount,
			:balance_due, :payment_status, :payment_method, :notes,
			:created_by_user_id, :completed_at, :created_at, :updated_at
		)`
	_, err := r.db.NamedExecContext(ctx, query, order)
	return &order, err
}

func (r *Repository) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*Order, error) {
	var order Order
	err := r.db.GetContext(ctx, &order, `
		SELECT
			so.*,
			COALESCE(r.name, '') AS resource_name
		FROM sales_orders so
		JOIN resources r ON r.id = so.resource_id
		WHERE so.id = $1 AND so.tenant_id = $2
		LIMIT 1`, id, tenantID)
	if err != nil {
		return nil, err
	}

	items, err := r.ListItemsByOrder(ctx, id)
	if err == nil {
		order.Items = items
	}

	return &order, nil
}

func (r *Repository) HydrateOrderPayments(ctx context.Context, order *Order, methods []OrderPaymentMethod) error {
	order.PaymentMethods = methods
	if order.PaymentMethods == nil {
		order.PaymentMethods = []OrderPaymentMethod{}
	}
	attempts, err := r.ListPaymentAttempts(ctx, order.ID, order.TenantID)
	if err != nil {
		return err
	}
	order.PaymentAttempts = attempts
	if hasAwaitingManualReview(attempts) {
		order.PaymentStatus = "awaiting_verification"
		if strings.TrimSpace(order.Status) == "open" {
			order.Status = "pending_payment"
		}
	}
	return nil
}

func (r *Repository) ListByTenant(ctx context.Context, tenantID uuid.UUID, limit int, status, search string) ([]Order, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	query := `
		SELECT
			so.*,
			COALESCE(r.name, '') AS resource_name
		FROM sales_orders so
		JOIN resources r ON r.id = so.resource_id
		WHERE so.tenant_id = $1`
	args := []any{tenantID}
	argIndex := 2

	if status = strings.TrimSpace(status); status != "" && strings.ToLower(status) != "all" {
		query += fmt.Sprintf(" AND LOWER(so.status) = LOWER($%d)", argIndex)
		args = append(args, status)
		argIndex++
	}

	if search = strings.TrimSpace(search); search != "" {
		query += fmt.Sprintf(`
			AND (
				so.order_number ILIKE $%[1]d OR
				r.name ILIKE $%[1]d OR
				COALESCE(so.notes, '') ILIKE $%[1]d
			)`, argIndex)
		args = append(args, "%"+search+"%")
		argIndex++
	}

	query += fmt.Sprintf(" ORDER BY so.created_at DESC LIMIT $%d", argIndex)
	args = append(args, limit)

	var items []Order
	if err := r.db.SelectContext(ctx, &items, query, args...); err != nil {
		return nil, err
	}
	return items, nil
}

func (r *Repository) ListOpenByTenant(ctx context.Context, tenantID uuid.UUID, limit int) ([]Order, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	var items []Order
	err := r.db.SelectContext(ctx, &items, `
		SELECT
			so.*,
			COALESCE(r.name, '') AS resource_name
		FROM sales_orders so
		JOIN resources r ON r.id = so.resource_id
		WHERE so.tenant_id = $1
		  AND so.status IN ('open', 'pending_payment', 'paid')
		ORDER BY so.updated_at DESC, so.created_at DESC
		LIMIT $2`, tenantID, limit)
	return items, err
}

func (r *Repository) ListItemsByOrder(ctx context.Context, orderID uuid.UUID) ([]OrderItem, error) {
	var items []OrderItem
	err := r.db.SelectContext(ctx, &items, `
		SELECT *
		FROM sales_order_items
		WHERE sales_order_id = $1
		ORDER BY created_at ASC`, orderID)
	if err != nil {
		return nil, err
	}

	emptyJSON := json.RawMessage("{}")
	for i := range items {
		if items[i].Metadata == nil {
			items[i].Metadata = &emptyJSON
		}
	}

	return items, nil
}

func (r *Repository) CreateItem(ctx context.Context, orderID uuid.UUID, item OrderItem) (*OrderItem, error) {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	query := `
		INSERT INTO sales_order_items (
			id, sales_order_id, resource_item_id, item_name, item_type,
			quantity, unit_price, subtotal, metadata, created_at, updated_at
		) VALUES (
			:id, :sales_order_id, :resource_item_id, :item_name, :item_type,
			:quantity, :unit_price, :subtotal, :metadata, :created_at, :updated_at
		)`
	if _, err := tx.NamedExecContext(ctx, query, item); err != nil {
		return nil, err
	}

	if err := r.recalculateOrderTotalsTx(ctx, tx, orderID); err != nil {
		return nil, err
	}

	return &item, tx.Commit()
}

func (r *Repository) UpdateItem(ctx context.Context, tenantID, orderID, itemID uuid.UUID, item OrderItem) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	query := `
		UPDATE sales_order_items
		SET
			resource_item_id = :resource_item_id,
			item_name = :item_name,
			item_type = :item_type,
			quantity = :quantity,
			unit_price = :unit_price,
			subtotal = :subtotal,
			metadata = :metadata,
			updated_at = :updated_at
		WHERE id = :id
		  AND sales_order_id = :sales_order_id
		  AND EXISTS (
			  SELECT 1 FROM sales_orders so
			  WHERE so.id = :sales_order_id AND so.tenant_id = :tenant_id
		  )`
	params := map[string]any{
		"id":               itemID,
		"sales_order_id":   orderID,
		"tenant_id":        tenantID,
		"resource_item_id": item.ResourceItemID,
		"item_name":        item.ItemName,
		"item_type":        item.ItemType,
		"quantity":         item.Quantity,
		"unit_price":       item.UnitPrice,
		"subtotal":         item.Subtotal,
		"metadata":         item.Metadata,
		"updated_at":       item.UpdatedAt,
	}
	if _, err := tx.NamedExecContext(ctx, query, params); err != nil {
		return err
	}

	if err := r.recalculateOrderTotalsTx(ctx, tx, orderID); err != nil {
		return err
	}
	return tx.Commit()
}

func (r *Repository) DeleteItem(ctx context.Context, tenantID, orderID, itemID uuid.UUID) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, `
		DELETE FROM sales_order_items
		WHERE id = $1
		  AND sales_order_id = $2
		  AND EXISTS (
			  SELECT 1 FROM sales_orders so
			  WHERE so.id = $2 AND so.tenant_id = $3
		  )`, itemID, orderID, tenantID); err != nil {
		return err
	}

	if err := r.recalculateOrderTotalsTx(ctx, tx, orderID); err != nil {
		return err
	}
	return tx.Commit()
}

func (r *Repository) UpdateCheckout(ctx context.Context, tenantID, orderID uuid.UUID, paymentMethod, notes string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE sales_orders
		SET
			status = CASE
				WHEN COALESCE(paid_amount, 0) >= COALESCE(grand_total, 0) AND COALESCE(grand_total, 0) > 0 THEN 'paid'
				ELSE 'pending_payment'
			END,
			payment_status = CASE
				WHEN COALESCE(paid_amount, 0) >= COALESCE(grand_total, 0) AND COALESCE(grand_total, 0) > 0 THEN 'settled'
				WHEN COALESCE(paid_amount, 0) > 0 THEN 'partial_paid'
				ELSE 'pending'
			END,
			payment_method = $3,
			notes = $4,
			updated_at = NOW()
		WHERE id = $1 AND tenant_id = $2`, orderID, tenantID, paymentMethod, notes)
	return err
}

func (r *Repository) SettleCash(ctx context.Context, tenantID, orderID uuid.UUID, paymentMethod, notes string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE sales_orders
		SET
			status = 'paid',
			payment_status = 'settled',
			payment_method = $3,
			notes = $4,
			paid_amount = grand_total,
			balance_due = 0,
			updated_at = NOW()
		WHERE id = $1 AND tenant_id = $2`, orderID, tenantID, paymentMethod, notes)
	return err
}

func (r *Repository) Close(ctx context.Context, tenantID, orderID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE sales_orders
		SET
			status = 'completed',
			completed_at = COALESCE(completed_at, NOW()),
			updated_at = NOW()
		WHERE id = $1
		  AND tenant_id = $2
		  AND COALESCE(balance_due, 0) <= 0`, orderID, tenantID)
	return err
}

func (r *Repository) GetResourceItemSnapshot(ctx context.Context, tenantID uuid.UUID, itemID uuid.UUID) (*OrderItem, error) {
	var row struct {
		ResourceItemID uuid.UUID        `db:"id"`
		ItemName       string           `db:"name"`
		ItemType       string           `db:"item_type"`
		UnitPrice      float64          `db:"price"`
		Metadata       *json.RawMessage `db:"metadata"`
	}
	err := r.db.GetContext(ctx, &row, `
		SELECT ri.id, ri.name, ri.item_type, ri.price, ri.metadata
		FROM resource_items ri
		JOIN resources r ON r.id = ri.resource_id
		WHERE ri.id = $1
		  AND r.tenant_id = $2
		LIMIT 1`, itemID, tenantID)
	if err != nil {
		return nil, err
	}

	emptyJSON := json.RawMessage("{}")
	if row.Metadata == nil {
		row.Metadata = &emptyJSON
	}

	return &OrderItem{
		ResourceItemID: &row.ResourceItemID,
		ItemName:       row.ItemName,
		ItemType:       row.ItemType,
		UnitPrice:      row.UnitPrice,
		Metadata:       row.Metadata,
	}, nil
}

func (r *Repository) CreatePaymentAttempt(ctx context.Context, item paymentAttemptRecord) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO sales_order_payment_attempts (
			id, sales_order_id, tenant_id, customer_id, method_code, method_label, category, verification_type, payment_scope,
			amount, status, reference_code, gateway_order_id, gateway_transaction_id, payer_note, admin_note, proof_url,
			metadata, submitted_at, verified_at, rejected_at, expires_at, created_at, updated_at
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,$8,$9,
			$10,$11,$12,$13,$14,$15,$16,$17,
			$18,$19,$20,$21,$22,$23,$24
		)`,
		item.ID, item.SalesOrderID, item.TenantID, item.CustomerID, item.MethodCode, item.MethodLabel, item.Category, item.VerificationType, item.PaymentScope,
		item.Amount, item.Status, item.ReferenceCode, item.GatewayOrderID, item.GatewayTransactionID, item.PayerNote, item.AdminNote, item.ProofURL,
		item.Metadata, item.SubmittedAt, item.VerifiedAt, item.RejectedAt, item.ExpiresAt, item.CreatedAt, item.UpdatedAt,
	)
	return err
}

func (r *Repository) ListPaymentAttempts(ctx context.Context, orderID, tenantID uuid.UUID) ([]OrderPaymentAttempt, error) {
	var items []OrderPaymentAttempt
	query := `
		SELECT id, method_code, method_label, verification_type, payment_scope, amount, status, reference_code, payer_note, admin_note, proof_url, created_at, submitted_at, verified_at, rejected_at
		FROM sales_order_payment_attempts
		WHERE sales_order_id = $1`
	args := []any{orderID}
	if tenantID != uuid.Nil {
		query += ` AND tenant_id = $2`
		args = append(args, tenantID)
	}
	query += ` ORDER BY created_at DESC`
	err := r.db.SelectContext(ctx, &items, query, args...)
	return items, err
}

func (r *Repository) HasPendingManualPaymentAttempt(ctx context.Context, orderID uuid.UUID) (bool, error) {
	var total int
	err := r.db.GetContext(ctx, &total, `
		SELECT COUNT(*)
		FROM sales_order_payment_attempts
		WHERE sales_order_id = $1
		  AND verification_type = 'manual'
		  AND status IN ('submitted', 'awaiting_verification')
		LIMIT 1`, orderID)
	return total > 0, err
}

func (r *Repository) GetPaymentAttempt(ctx context.Context, attemptID, tenantID uuid.UUID) (*paymentAttemptRecord, error) {
	var item paymentAttemptRecord
	err := r.db.GetContext(ctx, &item, `
		SELECT *
		FROM sales_order_payment_attempts
		WHERE id = $1 AND tenant_id = $2
		LIMIT 1`, attemptID, tenantID)
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *Repository) GetPaymentAttemptByGatewayOrderID(ctx context.Context, gatewayOrderID string) (*paymentAttemptRecord, error) {
	var item paymentAttemptRecord
	err := r.db.GetContext(ctx, &item, `
		SELECT *
		FROM sales_order_payment_attempts
		WHERE gateway_order_id = $1
		ORDER BY created_at DESC
		LIMIT 1`, gatewayOrderID)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *Repository) MarkPaymentAttemptStatus(ctx context.Context, attemptID uuid.UUID, status string, transactionID, adminNote *string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE sales_order_payment_attempts
		SET status = $2::text,
			gateway_transaction_id = CASE WHEN $3::text IS NOT NULL THEN $3::text ELSE gateway_transaction_id END,
			admin_note = CASE WHEN $4::text IS NOT NULL THEN $4::text ELSE admin_note END,
			verified_at = CASE WHEN $2::text IN ('paid', 'verified', 'settled') THEN COALESCE(verified_at, NOW()) ELSE verified_at END,
			rejected_at = CASE WHEN $2::text = 'rejected' THEN COALESCE(rejected_at, NOW()) ELSE rejected_at END,
			updated_at = NOW()
		WHERE id = $1`, attemptID, status, transactionID, adminNote)
	return err
}

func (r *Repository) MarkOrderAwaitingVerification(ctx context.Context, orderID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE sales_orders
		SET payment_status = CASE
				WHEN COALESCE(paid_amount, 0) >= COALESCE(grand_total, 0) AND COALESCE(grand_total, 0) > 0 THEN 'settled'
				WHEN COALESCE(paid_amount, 0) > 0 THEN 'partial_paid'
				ELSE 'pending'
			END,
			status = CASE WHEN status = 'open' THEN 'pending_payment' ELSE status END,
			updated_at = NOW()
		WHERE id = $1`, orderID)
	return err
}

func (r *Repository) RestoreOrderPaymentStatus(ctx context.Context, orderID uuid.UUID, paymentStatus string, paidAmount, balanceDue float64, status string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE sales_orders
		SET payment_status = $2,
			paid_amount = $3,
			balance_due = $4,
			status = $5,
			updated_at = NOW()
		WHERE id = $1`, orderID, paymentStatus, paidAmount, balanceDue, status)
	return err
}

func (r *Repository) ApplyManualSettlementPayment(ctx context.Context, orderID uuid.UUID, methodCode string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE sales_orders
		SET status = 'paid',
			payment_status = 'settled',
			payment_method = $2,
			paid_amount = grand_total,
			balance_due = 0,
			updated_at = NOW()
		WHERE id = $1`, orderID, methodCode)
	return err
}

func (r *Repository) UpdateSettlementFromGateway(ctx context.Context, orderID uuid.UUID, status string, paymentMethod *string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE sales_orders
		SET payment_status = CASE
				WHEN $2::text IN ('paid', 'settled') THEN 'settled'
				ELSE $2::text
			END,
			status = CASE
				WHEN $2::text IN ('paid', 'settled') THEN 'paid'
				WHEN status = 'open' THEN 'pending_payment'
				ELSE status
			END,
			payment_method = COALESCE($3::text, payment_method),
			paid_amount = CASE
				WHEN $2::text IN ('paid', 'settled') THEN grand_total
				ELSE paid_amount
			END,
			balance_due = CASE
				WHEN $2::text IN ('paid', 'settled') THEN 0
				ELSE balance_due
			END,
			updated_at = NOW()
		WHERE id = $1`, orderID, status, paymentMethod)
	return err
}

func (r *Repository) ListPOSActionFeed(ctx context.Context, tenantID uuid.UUID, limit int, windowMinutes int, search string) ([]POSActionFeedItem, error) {
	if limit <= 0 {
		limit = 40
	}
	if limit > 200 {
		limit = 200
	}
	if windowMinutes <= 0 {
		windowMinutes = 240
	}

	search = strings.TrimSpace(search)

	query := `
		WITH booking_candidates AS (
			SELECT
				'booking'::text AS kind,
				b.id,
				b.tenant_id,
				b.resource_id,
				COALESCE(r.name, '') AS resource_name,
				b.customer_id,
				COALESCE(c.name, '') AS customer_name,
				COALESCE(c.phone, '') AS customer_phone,
				COALESCE(b.status, '') AS status,
				COALESCE(b.payment_status, '') AS payment_status,
				CASE
					WHEN COALESCE(b.payment_status, '') = 'awaiting_verification' THEN 'Review bukti bayar'
					WHEN COALESCE(b.status, '') IN ('active', 'ongoing') THEN 'Monitor sesi'
					WHEN COALESCE(b.status, '') IN ('pending', 'confirmed') AND COALESCE(b.payment_status, '') IN ('pending', 'partial_paid', 'unpaid', 'failed', 'expired') THEN 'Tuntaskan pembayaran'
					WHEN COALESCE(b.status, '') IN ('pending', 'confirmed') THEN 'Siapkan booking'
					WHEN COALESCE(b.status, '') = 'completed' AND (COALESCE(b.balance_due, 0) > 0 OR COALESCE(b.payment_status, '') IN ('pending', 'partial_paid', 'unpaid', 'failed', 'expired', 'awaiting_verification')) THEN 'Lanjutkan pelunasan'
					ELSE 'Review booking'
				END AS action_label,
				CASE
					WHEN COALESCE(b.payment_status, '') = 'awaiting_verification' THEN 5
					WHEN COALESCE(b.status, '') IN ('active', 'ongoing') THEN 10
					WHEN COALESCE(b.status, '') IN ('pending', 'confirmed') AND COALESCE(b.payment_status, '') IN ('pending', 'partial_paid', 'unpaid', 'failed', 'expired') THEN 15
					WHEN COALESCE(b.status, '') = 'completed' AND (COALESCE(b.balance_due, 0) > 0 OR COALESCE(b.payment_status, '') IN ('pending', 'partial_paid', 'unpaid', 'failed', 'expired', 'awaiting_verification')) THEN 20
					WHEN COALESCE(b.status, '') IN ('pending', 'confirmed') THEN 25
					ELSE 30
				END AS priority,
				b.start_time AS scheduled_at,
				b.end_time,
				COALESCE(b.grand_total, 0) AS total,
				COALESCE(b.balance_due, 0) AS balance_due,
				COALESCE(r.operating_mode, 'timed') AS operating_mode,
				COALESCE(b.start_time, b.created_at) AS sort_at
			FROM bookings b
			JOIN resources r ON r.id = b.resource_id
			JOIN customers c ON c.id = b.customer_id
			WHERE b.tenant_id = $1
			  AND COALESCE(b.status, '') NOT IN ('cancelled')
			  AND NOT (
				COALESCE(b.status, '') = 'completed'
				AND COALESCE(b.balance_due, 0) <= 0
				AND COALESCE(b.payment_status, '') IN ('settled', 'paid')
			  )
		),
		sales_candidates AS (
			SELECT
				'sales_order'::text AS kind,
				so.id,
				so.tenant_id,
				so.resource_id,
				COALESCE(r.name, '') AS resource_name,
				so.customer_id,
				COALESCE(c.name, '') AS customer_name,
				COALESCE(c.phone, '') AS customer_phone,
				COALESCE(so.status, '') AS status,
				CASE
					WHEN EXISTS (
						SELECT 1
						FROM sales_order_payment_attempts sopa
						WHERE sopa.sales_order_id = so.id
						  AND sopa.verification_type = 'manual'
						  AND sopa.status IN ('submitted', 'awaiting_verification')
					) THEN 'awaiting_verification'
					ELSE COALESCE(so.payment_status, '')
				END AS payment_status,
				CASE
					WHEN EXISTS (
						SELECT 1
						FROM sales_order_payment_attempts sopa
						WHERE sopa.sales_order_id = so.id
						  AND sopa.verification_type = 'manual'
						  AND sopa.status IN ('submitted', 'awaiting_verification')
					) THEN 'Review bukti bayar'
					WHEN COALESCE(so.status, '') = 'open' THEN 'Lengkapi order'
					WHEN COALESCE(so.status, '') = 'pending_payment' THEN 'Tuntaskan pembayaran'
					WHEN COALESCE(so.status, '') = 'paid' THEN 'Tutup transaksi'
					ELSE 'Review transaksi'
				END AS action_label,
				CASE
					WHEN EXISTS (
						SELECT 1
						FROM sales_order_payment_attempts sopa
						WHERE sopa.sales_order_id = so.id
						  AND sopa.verification_type = 'manual'
						  AND sopa.status IN ('submitted', 'awaiting_verification')
					) THEN 5
					WHEN COALESCE(so.status, '') = 'pending_payment' THEN 15
					WHEN COALESCE(so.status, '') = 'paid' THEN 25
					ELSE 35
				END AS priority,
				NULL::timestamptz AS scheduled_at,
				NULL::timestamptz AS end_time,
				COALESCE(so.grand_total, 0) AS total,
				COALESCE(so.balance_due, 0) AS balance_due,
				COALESCE(r.operating_mode, 'direct_sale') AS operating_mode,
				COALESCE(so.updated_at, so.created_at) AS sort_at
			FROM sales_orders so
			JOIN resources r ON r.id = so.resource_id
			LEFT JOIN customers c ON c.id = so.customer_id
			WHERE so.tenant_id = $1
			  AND COALESCE(so.status, '') IN ('open', 'pending_payment', 'paid')
		),
		merged AS (
			SELECT * FROM booking_candidates
			UNION ALL
			SELECT * FROM sales_candidates
		)
		SELECT kind, id, tenant_id, resource_id, resource_name, customer_id, customer_name, customer_phone,
		       status, payment_status, action_label, priority, scheduled_at, end_time, total, balance_due, operating_mode
		FROM merged
		WHERE (
			$2 = ''
			OR resource_name ILIKE '%' || $2 || '%'
			OR customer_name ILIKE '%' || $2 || '%'
			OR customer_phone ILIKE '%' || $2 || '%'
		)
		ORDER BY priority ASC, sort_at ASC
		LIMIT $3`

	var items []POSActionFeedItem
	if err := r.db.SelectContext(ctx, &items, query, tenantID, search, limit); err != nil {
		return nil, err
	}
	return items, nil
}

func (r *Repository) recalculateOrderTotalsTx(ctx context.Context, tx *sqlx.Tx, orderID uuid.UUID) error {
	_, err := tx.ExecContext(ctx, `
		UPDATE sales_orders so
		SET
			subtotal = agg.subtotal,
			grand_total = GREATEST(agg.subtotal - COALESCE(so.discount_amount, 0), 0),
			balance_due = GREATEST(GREATEST(agg.subtotal - COALESCE(so.discount_amount, 0), 0) - COALESCE(so.paid_amount, 0), 0),
			payment_status = CASE
				WHEN COALESCE(so.paid_amount, 0) >= GREATEST(agg.subtotal - COALESCE(so.discount_amount, 0), 0)
					AND GREATEST(agg.subtotal - COALESCE(so.discount_amount, 0), 0) > 0 THEN 'settled'
				WHEN COALESCE(so.paid_amount, 0) > 0 THEN 'partial_paid'
				ELSE 'unpaid'
			END,
			updated_at = NOW()
		FROM (
			SELECT COALESCE(SUM(subtotal), 0) AS subtotal
			FROM sales_order_items
			WHERE sales_order_id = $1
		) agg
		WHERE so.id = $1`, orderID)
	return err
}

func hasAwaitingManualReview(items []OrderPaymentAttempt) bool {
	for _, item := range items {
		if item.VerificationType == "manual" && (item.Status == "submitted" || item.Status == "awaiting_verification") {
			return true
		}
	}
	return false
}
