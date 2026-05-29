package billing

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/helwiza/backend/internal/platform/access"
	"github.com/jmoiron/sqlx"
	"github.com/redis/go-redis/v9"
)

type Repository struct {
	db  *sqlx.DB
	rdb *redis.Client
}

func NewRepository(db *sqlx.DB, rdb ...*redis.Client) *Repository {
	var client *redis.Client
	if len(rdb) > 0 {
		client = rdb[0]
	}
	return &Repository{db: db, rdb: client}
}

func reservationPublicBookingCacheKey(token uuid.UUID) string {
	return fmt.Sprintf("reservation:booking:public:%s", token.String())
}

func reservationCustomerBookingCacheKey(bookingID, customerID uuid.UUID) string {
	return fmt.Sprintf("reservation:booking:customer:%s:%s", bookingID.String(), customerID.String())
}

func reservationAdminBookingCacheKey(bookingID, tenantID uuid.UUID) string {
	return fmt.Sprintf("reservation:booking:admin:%s:%s", bookingID.String(), tenantID.String())
}

func reservationActiveSessionsCacheKey(tenantID uuid.UUID) string {
	return fmt.Sprintf("reservation:booking:active:%s", tenantID.String())
}

func reservationTenantBookingsCacheKey(tenantID uuid.UUID, status string) string {
	status = strings.ToLower(strings.TrimSpace(status))
	if status == "" {
		status = "all"
	}
	return fmt.Sprintf("reservation:booking:list:%s:%s", tenantID.String(), status)
}

func (r *Repository) getPlanFeatureMatrixCacheKey() string {
	return "platform:plan-features:v1"
}

func (r *Repository) InvalidateReservationBookingCache(ctx context.Context, bookingID uuid.UUID) {
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
	if err := r.db.GetContext(ctx, &row, `
		SELECT id, tenant_id, customer_id, access_token, status
		FROM bookings
		WHERE id = $1
		LIMIT 1`, bookingID); err != nil {
		return
	}

	keys := []string{
		reservationAdminBookingCacheKey(row.ID, row.TenantID),
		reservationActiveSessionsCacheKey(row.TenantID),
		reservationTenantBookingsCacheKey(row.TenantID, ""),
		reservationTenantBookingsCacheKey(row.TenantID, row.Status),
	}
	if row.AccessToken != uuid.Nil {
		keys = append(keys, reservationPublicBookingCacheKey(row.AccessToken))
	}
	if row.CustomerID != nil && *row.CustomerID != uuid.Nil {
		keys = append(keys, reservationCustomerBookingCacheKey(row.ID, *row.CustomerID))
	}
	_ = r.rdb.Del(ctx, keys...).Err()
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

func (r *Repository) GetPlanFeatureMatrix(ctx context.Context) (map[string][]string, error) {
	if r.rdb != nil {
		if val, err := r.rdb.Get(ctx, r.getPlanFeatureMatrixCacheKey()).Result(); err == nil && strings.TrimSpace(val) != "" {
			var payload struct {
				Plans map[string][]string `json:"plans"`
			}
			if err := json.Unmarshal([]byte(val), &payload); err == nil {
				return access.NormalizePlanFeatureMatrix(payload.Plans), nil
			}
		}
	}

	var raw json.RawMessage
	err := r.db.GetContext(ctx, &raw, `
		SELECT value_json
		FROM platform_feature_settings
		WHERE key = 'plan_features'
		LIMIT 1`)
	if err == sql.ErrNoRows {
		return access.GetPlanFeatureMatrix(), nil
	}
	if err != nil {
		return nil, err
	}

	var payload struct {
		Plans map[string][]string `json:"plans"`
	}
	if err := json.Unmarshal(raw, &payload); err != nil {
		return nil, err
	}

	matrix := access.NormalizePlanFeatureMatrix(payload.Plans)
	if r.rdb != nil {
		if encoded, err := access.MarshalNormalizedPlanFeatureMatrix(matrix); err == nil {
			_ = r.rdb.Set(ctx, r.getPlanFeatureMatrixCacheKey(), encoded, 30*time.Minute).Err()
		}
	}
	return matrix, nil
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

func (r *Repository) GetTenantIDByBookingID(ctx context.Context, exec sqlx.ExtContext, bookingID uuid.UUID) (uuid.UUID, error) {
	var tenantID uuid.UUID
	err := sqlx.GetContext(ctx, exec, &tenantID, `
		SELECT tenant_id
		FROM bookings
		WHERE id = $1
		LIMIT 1`,
		bookingID,
	)
	return tenantID, err
}

func (r *Repository) ApplyManualDepositPayment(ctx context.Context, exec sqlx.ExtContext, bookingID uuid.UUID, methodCode string) error {
	_, err := exec.ExecContext(ctx, `
		UPDATE bookings
		SET payment_status = CASE
				WHEN GREATEST(grand_total - GREATEST(paid_amount, deposit_amount), 0) <= 0 THEN 'settled'
				WHEN deposit_amount > 0 THEN 'partial_paid'
				ELSE 'paid'
			END,
			status = CASE
				WHEN status = 'pending' THEN 'confirmed'
				ELSE status
			END,
			payment_method = $2,
			paid_amount = GREATEST(paid_amount, deposit_amount),
			balance_due = GREATEST(grand_total - GREATEST(paid_amount, deposit_amount), 0),
			settled_at = CASE
				WHEN GREATEST(grand_total - GREATEST(paid_amount, deposit_amount), 0) <= 0 THEN COALESCE(settled_at, NOW())
				ELSE settled_at
			END,
			last_status_changed_at = CASE
				WHEN status = 'pending' THEN NOW()
				ELSE last_status_changed_at
			END,
			deposit_override_active = false,
			deposit_override_reason = NULL,
			deposit_override_by = NULL,
			deposit_override_at = NULL
		WHERE id = $1`,
		bookingID, methodCode,
	)
	if err != nil {
		return err
	}
	return r.updatePromoRedemptionStatus(ctx, exec, bookingID, "redeemed")
}

func (r *Repository) ApplyManualSettlementPayment(ctx context.Context, exec sqlx.ExtContext, bookingID uuid.UUID, methodCode string) error {
	_, err := exec.ExecContext(ctx, `
		UPDATE bookings
		SET payment_status = 'settled',
			status = CASE
				WHEN status IN ('pending', 'confirmed', 'active') THEN 'completed'
				ELSE status
			END,
			payment_method = $2,
			paid_amount = grand_total,
			balance_due = 0,
			settled_at = COALESCE(settled_at, NOW()),
			completed_at = CASE
				WHEN status IN ('pending', 'confirmed', 'active') THEN COALESCE(completed_at, NOW())
				ELSE completed_at
			END,
			last_status_changed_at = CASE
				WHEN status IN ('pending', 'confirmed', 'active') THEN NOW()
				ELSE last_status_changed_at
			END,
			deposit_override_active = false,
			deposit_override_reason = NULL,
			deposit_override_by = NULL,
			deposit_override_at = NULL
		WHERE id = $1`,
		bookingID, methodCode,
	)
	if err != nil {
		return err
	}
	return r.updatePromoRedemptionStatus(ctx, exec, bookingID, "redeemed")
}

func (r *Repository) ListTenantPaymentMethods(ctx context.Context, tenantID uuid.UUID) ([]PaymentMethodOption, error) {
	var items []PaymentMethodOption
	err := r.db.SelectContext(ctx, &items, `
		SELECT code, display_name, category, verification_type, provider, instructions, is_active, sort_order, metadata
		FROM tenant_payment_methods
		WHERE tenant_id = $1 AND is_active = true
		ORDER BY sort_order ASC, created_at ASC`,
		tenantID,
	)
	if err != nil {
		return nil, err
	}
	if len(items) == 0 {
		if err := r.seedDefaultTenantPaymentMethods(ctx, tenantID); err != nil {
			return nil, err
		}
		if err := r.db.SelectContext(ctx, &items, `
			SELECT code, display_name, category, verification_type, provider, instructions, is_active, sort_order, metadata
			FROM tenant_payment_methods
			WHERE tenant_id = $1 AND is_active = true
			ORDER BY sort_order ASC, created_at ASC`,
			tenantID,
		); err != nil {
			return nil, err
		}
	}
	return items, nil
}

func (r *Repository) GetTenantPaymentMethod(ctx context.Context, exec sqlx.ExtContext, tenantID uuid.UUID, code string) (PaymentMethodOption, error) {
	var item PaymentMethodOption
	err := sqlx.GetContext(ctx, exec, &item, `
		SELECT code, display_name, category, verification_type, provider, instructions, is_active, sort_order, metadata
		FROM tenant_payment_methods
		WHERE tenant_id = $1 AND code = $2 AND is_active = true
		LIMIT 1`,
		tenantID, code,
	)
	if err == sql.ErrNoRows {
		if seedErr := r.seedDefaultTenantPaymentMethods(ctx, tenantID); seedErr != nil {
			return item, seedErr
		}
		err = sqlx.GetContext(ctx, exec, &item, `
			SELECT code, display_name, category, verification_type, provider, instructions, is_active, sort_order, metadata
			FROM tenant_payment_methods
			WHERE tenant_id = $1 AND code = $2 AND is_active = true
			LIMIT 1`,
			tenantID, code,
		)
	}
	return item, err
}

func defaultTenantPaymentMethodOptions() []PaymentMethodOption {
	return []PaymentMethodOption{
		{Code: "midtrans", DisplayName: "Midtrans / QRIS Gateway", Category: "gateway", VerificationType: "auto", Provider: "midtrans", Instructions: "Pembayaran diverifikasi otomatis oleh gateway Midtrans.", IsActive: true, SortOrder: 10, Metadata: []byte(`{}`)},
		{Code: "bank_transfer", DisplayName: "Transfer Bank", Category: "manual", VerificationType: "manual", Provider: "bank_transfer", Instructions: "Transfer ke rekening tenant lalu kirim bukti bayar untuk diverifikasi admin.", IsActive: false, SortOrder: 20, Metadata: []byte(`{}`)},
		{Code: "qris_static", DisplayName: "QRIS Static", Category: "manual", VerificationType: "manual", Provider: "qris_static", Instructions: "Scan QRIS tenant lalu kirim bukti bayar untuk diverifikasi admin.", IsActive: false, SortOrder: 30, Metadata: []byte(`{}`)},
		{Code: "cash", DisplayName: "Cash / Bayar di Tempat", Category: "manual", VerificationType: "manual", Provider: "cash", Instructions: "Pembayaran diterima langsung oleh admin atau kasir tenant.", IsActive: true, SortOrder: 40, Metadata: []byte(`{}`)},
	}
}

func (r *Repository) seedDefaultTenantPaymentMethods(ctx context.Context, tenantID uuid.UUID) error {
	now := time.Now().UTC()
	for _, item := range defaultTenantPaymentMethodOptions() {
		if _, err := r.db.ExecContext(ctx, `
			INSERT INTO tenant_payment_methods (
				id, tenant_id, code, display_name, category, verification_type, provider,
				instructions, is_active, sort_order, metadata, created_at, updated_at
			) VALUES (
				$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13
			)
			ON CONFLICT (tenant_id, code) DO NOTHING`,
			uuid.New(), tenantID, item.Code, item.DisplayName, item.Category, item.VerificationType, item.Provider,
			item.Instructions, item.IsActive, item.SortOrder, item.Metadata, now, now,
		); err != nil {
			return err
		}
	}
	return nil
}

func (r *Repository) CreateBookingPaymentAttempt(ctx context.Context, exec sqlx.ExtContext, item BookingPaymentAttempt) error {
	_, err := exec.ExecContext(ctx, `
		INSERT INTO booking_payment_attempts (
			id, booking_id, tenant_id, customer_id, method_code, method_label, category, verification_type, payment_scope,
			amount, status, reference_code, gateway_order_id, gateway_transaction_id, payer_note, admin_note, proof_url,
			metadata, submitted_at, verified_at, rejected_at, expires_at, created_at, updated_at
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,$8,$9,
			$10,$11,$12,$13,$14,$15,$16,$17,
			$18,$19,$20,$21,$22,$23,$24
		)`,
		item.ID, item.BookingID, item.TenantID, item.CustomerID, item.MethodCode, item.MethodLabel, item.Category, item.VerificationType, item.PaymentScope,
		item.Amount, item.Status, item.ReferenceCode, item.GatewayOrderID, item.GatewayTransactionID, item.PayerNote, item.AdminNote, item.ProofURL,
		item.Metadata, item.SubmittedAt, item.VerifiedAt, item.RejectedAt, item.ExpiresAt, item.CreatedAt, item.UpdatedAt,
	)
	return err
}

func (r *Repository) HasPendingManualPaymentAttempt(ctx context.Context, exec sqlx.ExtContext, bookingID uuid.UUID, scope string) (bool, error) {
	var total int
	err := sqlx.GetContext(ctx, exec, &total, `
		SELECT COUNT(*)
		FROM booking_payment_attempts
		WHERE booking_id = $1
		  AND payment_scope = $2
		  AND verification_type = 'manual'
		  AND status IN ('submitted', 'awaiting_verification')
		LIMIT 1`,
		bookingID, strings.TrimSpace(scope),
	)
	return total > 0, err
}

func (r *Repository) MarkBookingAwaitingVerification(ctx context.Context, exec sqlx.ExtContext, bookingID uuid.UUID) error {
	_, err := exec.ExecContext(ctx, `
		UPDATE bookings
		SET payment_status = 'awaiting_verification'
		WHERE id = $1`,
		bookingID,
	)
	return err
}

func (r *Repository) RestoreBookingPaymentStatus(ctx context.Context, exec sqlx.ExtContext, bookingID uuid.UUID, paymentStatus string, paidAmount, balanceDue float64, status string) error {
	_, err := exec.ExecContext(ctx, `
		UPDATE bookings
		SET payment_status = $2,
			paid_amount = $3,
			balance_due = $4,
			status = $5
		WHERE id = $1`,
		bookingID, paymentStatus, paidAmount, balanceDue, status,
	)
	return err
}

func (r *Repository) GetBookingPaymentAttemptByGatewayOrderID(ctx context.Context, exec sqlx.ExtContext, orderID string) (*BookingPaymentAttempt, error) {
	var item BookingPaymentAttempt
	err := sqlx.GetContext(ctx, exec, &item, `
		SELECT *
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

func (r *Repository) MarkBookingPaymentAttemptStatus(ctx context.Context, exec sqlx.ExtContext, id uuid.UUID, status string, transactionID, adminNote *string) error {
	_, err := exec.ExecContext(ctx, `
		UPDATE booking_payment_attempts
		SET status = $2::text,
			gateway_transaction_id = CASE WHEN $3::text IS NOT NULL THEN $3::text ELSE gateway_transaction_id END,
			admin_note = CASE WHEN $4::text IS NOT NULL THEN $4::text ELSE admin_note END,
			verified_at = CASE WHEN $2::text IN ('paid', 'verified', 'settled') THEN COALESCE(verified_at, NOW()) ELSE verified_at END,
			rejected_at = CASE WHEN $2::text = 'rejected' THEN COALESCE(rejected_at, NOW()) ELSE rejected_at END,
			updated_at = NOW()
		WHERE id = $1`,
		id, status, transactionID, adminNote,
	)
	return err
}

func (r *Repository) ListBookingPaymentAttempts(ctx context.Context, bookingID uuid.UUID, tenantID uuid.UUID) ([]BookingPaymentAttempt, error) {
	var items []BookingPaymentAttempt
	query := `
		SELECT *
		FROM booking_payment_attempts
		WHERE booking_id = $1
	`
	args := []any{bookingID}
	if tenantID != uuid.Nil {
		query += ` AND tenant_id = $2`
		args = append(args, tenantID)
	}
	query += ` ORDER BY created_at DESC`
	err := r.db.SelectContext(ctx, &items, query, args...)
	return items, err
}

func normalizeReportPage(page, pageSize int) (int, int, int) {
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 50
	}
	if pageSize > 200 {
		pageSize = 200
	}
	return page, pageSize, (page - 1) * pageSize
}

func normalizeReportRow(row map[string]any) map[string]any {
	normalized := make(map[string]any, len(row))
	for key, value := range row {
		switch typed := value.(type) {
		case []byte:
			normalized[key] = string(typed)
		default:
			normalized[key] = value
		}
	}
	return normalized
}

func scanReportRows(rows *sqlx.Rows) ([]map[string]any, error) {
	defer rows.Close()
	items := []map[string]any{}
	for rows.Next() {
		row := map[string]any{}
		if err := rows.MapScan(row); err != nil {
			return nil, err
		}
		items = append(items, normalizeReportRow(row))
	}
	return items, rows.Err()
}

func reportQueryDefaults(q ReportQuery) (ReportQuery, int) {
	page, pageSize, offset := normalizeReportPage(q.Page, q.PageSize)
	q.Page = page
	q.PageSize = pageSize
	q.From = strings.TrimSpace(q.From)
	q.To = strings.TrimSpace(q.To)
	q.Status = strings.ToLower(strings.TrimSpace(q.Status))
	q.Method = strings.ToLower(strings.TrimSpace(q.Method))
	q.Source = strings.ToLower(strings.TrimSpace(q.Source))
	q.Search = strings.TrimSpace(q.Search)
	return q, offset
}

func appendReportFilter(where *[]string, args *[]any, clause string, value any) {
	*args = append(*args, value)
	*where = append(*where, fmt.Sprintf(clause, len(*args)))
}

type reportFilterOptions struct {
	DateColumn    string
	SearchColumns []string
	StatusColumns []string
	MethodColumn  string
	SourceColumn  string
}

func buildReportWhere(q ReportQuery, opts reportFilterOptions, initialArgs ...any) (string, []any) {
	where := []string{}
	args := append([]any{}, initialArgs...)
	if q.From != "" && opts.DateColumn != "" {
		appendReportFilter(&where, &args, opts.DateColumn+" >= $%d::date", q.From)
	}
	if q.To != "" && opts.DateColumn != "" {
		appendReportFilter(&where, &args, opts.DateColumn+" < ($%d::date + INTERVAL '1 day')", q.To)
	}
	if q.Status != "" && q.Status != "all" && len(opts.StatusColumns) > 0 {
		args = append(args, q.Status)
		placeholder := fmt.Sprintf("$%d", len(args))
		statusClauses := make([]string, 0, len(opts.StatusColumns))
		for _, column := range opts.StatusColumns {
			statusClauses = append(statusClauses, fmt.Sprintf("LOWER(COALESCE(%s,'')) = %s", column, placeholder))
		}
		where = append(where, "("+strings.Join(statusClauses, " OR ")+")")
	}
	if q.Method != "" && q.Method != "all" && opts.MethodColumn != "" {
		appendReportFilter(&where, &args, "LOWER(COALESCE("+opts.MethodColumn+",'')) = $%d", q.Method)
	}
	if q.Source != "" && q.Source != "all" && opts.SourceColumn != "" {
		appendReportFilter(&where, &args, "LOWER(COALESCE("+opts.SourceColumn+",'')) = $%d", q.Source)
	}
	if q.Search != "" && len(opts.SearchColumns) > 0 {
		args = append(args, "%"+q.Search+"%")
		placeholder := fmt.Sprintf("$%d", len(args))
		likeClauses := make([]string, 0, len(opts.SearchColumns))
		for _, column := range opts.SearchColumns {
			likeClauses = append(likeClauses, fmt.Sprintf("%s ILIKE %s", column, placeholder))
		}
		where = append(where, "("+strings.Join(likeClauses, " OR ")+")")
	}
	if len(where) == 0 {
		return "", args
	}
	return " WHERE " + strings.Join(where, " AND "), args
}

func (r *Repository) reportRows(ctx context.Context, cteSQL string, selectSQL string, whereSQL string, args []any, orderBy string, pageSize, offset int) (TenantReportRowsRes, error) {
	var total int
	if err := r.db.GetContext(ctx, &total, cteSQL+" SELECT COUNT(*) FROM report"+whereSQL, args...); err != nil {
		return TenantReportRowsRes{}, err
	}

	listArgs := append([]any{}, args...)
	listArgs = append(listArgs, pageSize, offset)
	rows, err := r.db.QueryxContext(ctx,
		cteSQL+" "+selectSQL+whereSQL+" "+orderBy+fmt.Sprintf(" LIMIT $%d OFFSET $%d", len(listArgs)-1, len(listArgs)),
		listArgs...,
	)
	if err != nil {
		return TenantReportRowsRes{}, err
	}
	items, err := scanReportRows(rows)
	if err != nil {
		return TenantReportRowsRes{}, err
	}
	return TenantReportRowsRes{Items: items, Total: total}, nil
}

func (r *Repository) revenueReportBaseSQL() string {
	return `
		WITH report AS (
			SELECT
				'booking'::text AS tipe,
				b.id::text AS ref,
				COALESCE(c.name, '-') AS customer,
				COALESCE(res.name, '-') AS resource,
				b.status AS status,
				b.status AS status_booking,
				b.payment_status AS status_bayar,
				b.payment_method,
				COALESCE(b.grand_total, 0)::numeric AS total,
				COALESCE(b.paid_amount, 0)::numeric AS paid,
				COALESCE(b.balance_due, 0)::numeric AS sisa,
				COALESCE(b.start_time, b.created_at) AS tanggal
			FROM bookings b
			LEFT JOIN customers c ON c.id = b.customer_id
			LEFT JOIN resources res ON res.id = b.resource_id
			WHERE b.tenant_id = $1
			UNION ALL
			SELECT
				'pos'::text AS tipe,
				so.order_number AS ref,
				COALESCE(c.name, '-') AS customer,
				COALESCE(res.name, '-') AS resource,
				so.status AS status,
				so.status AS status_booking,
				so.payment_status AS status_bayar,
				so.payment_method,
				COALESCE(so.grand_total, 0)::numeric AS total,
				COALESCE(so.paid_amount, 0)::numeric AS paid,
				COALESCE(so.balance_due, 0)::numeric AS sisa,
				COALESCE(so.completed_at, so.updated_at, so.created_at) AS tanggal
			FROM sales_orders so
			LEFT JOIN customers c ON c.id = so.customer_id
			LEFT JOIN resources res ON res.id = so.resource_id
			WHERE so.tenant_id = $1
		)`
}

func (r *Repository) ListTenantRevenueReport(ctx context.Context, tenantID uuid.UUID, q ReportQuery) (TenantReportRowsRes, error) {
	q, offset := reportQueryDefaults(q)
	base := r.revenueReportBaseSQL()
	whereSQL, args := buildReportWhere(q, reportFilterOptions{
		DateColumn:    "tanggal",
		SearchColumns: []string{"ref", "customer", "resource", "status", "status_bayar", "payment_method"},
		StatusColumns: []string{"status", "status_bayar"},
		MethodColumn:  "payment_method",
	}, tenantID)

	res, err := r.reportRows(ctx, base, "SELECT * FROM report", whereSQL, args, "ORDER BY tanggal DESC", q.PageSize, offset)
	if err != nil {
		return TenantReportRowsRes{}, err
	}
	summary := map[string]any{}
	if err := r.db.QueryRowxContext(ctx, base+` SELECT
			COALESCE(SUM(total), 0) AS total,
			COALESCE(SUM(paid), 0) AS paid,
			COALESCE(SUM(sisa), 0) AS outstanding,
			COUNT(*) AS entries
		FROM report`+whereSQL, args...).MapScan(summary); err != nil {
		return TenantReportRowsRes{}, err
	}
	res.Summary = normalizeReportRow(summary)
	return res, nil
}

func (r *Repository) ListTenantExpenseReport(ctx context.Context, tenantID uuid.UUID, q ReportQuery) (TenantReportRowsRes, error) {
	q, offset := reportQueryDefaults(q)
	base := `
		WITH report AS (
			SELECT
				e.id::text AS ref,
				e.expense_date AS tanggal,
				e.title AS judul,
				e.category AS kategori,
				e.vendor,
				e.payment_method,
				COALESCE(e.amount, 0)::numeric AS jumlah,
				e.notes
			FROM expenses e
			WHERE e.tenant_id = $1
		)`
	whereSQL, args := buildReportWhere(q, reportFilterOptions{
		DateColumn:    "tanggal",
		SearchColumns: []string{"ref", "judul", "kategori", "vendor", "payment_method", "notes"},
		MethodColumn:  "payment_method",
	}, tenantID)
	res, err := r.reportRows(ctx, base, "SELECT * FROM report", whereSQL, args, "ORDER BY tanggal DESC", q.PageSize, offset)
	if err != nil {
		return TenantReportRowsRes{}, err
	}
	summary := map[string]any{}
	if err := r.db.QueryRowxContext(ctx, base+` SELECT COALESCE(SUM(jumlah), 0) AS total, COUNT(*) AS entries FROM report`+whereSQL, args...).MapScan(summary); err != nil {
		return TenantReportRowsRes{}, err
	}
	res.Summary = normalizeReportRow(summary)
	return res, nil
}

func (r *Repository) ListTenantTransactionReport(ctx context.Context, tenantID uuid.UUID, q ReportQuery) (TenantReportRowsRes, error) {
	return r.ListTenantRevenueReport(ctx, tenantID, q)
}

func (r *Repository) ListTenantCustomerReport(ctx context.Context, tenantID uuid.UUID, q ReportQuery) (TenantReportRowsRes, error) {
	q, offset := reportQueryDefaults(q)
	base := `
		WITH report AS (
			SELECT
				c.id::text AS ref,
				c.name AS nama,
				c.phone,
				COALESCE(c.email, '') AS email,
				COALESCE(c.tier, '') AS tier,
				COALESCE(c.total_visits, 0) AS kunjungan,
				COALESCE(c.total_spent, 0)::numeric AS belanja,
				c.last_visit AS terakhir,
				c.created_at AS tanggal
			FROM customers c
			WHERE c.tenant_id = $1
		)`
	whereSQL, args := buildReportWhere(q, reportFilterOptions{
		DateColumn:    "tanggal",
		SearchColumns: []string{"ref", "nama", "phone", "email", "tier"},
	}, tenantID)
	res, err := r.reportRows(ctx, base, "SELECT * FROM report", whereSQL, args, "ORDER BY belanja DESC, tanggal DESC", q.PageSize, offset)
	if err != nil {
		return TenantReportRowsRes{}, err
	}
	summary := map[string]any{}
	if err := r.db.QueryRowxContext(ctx, base+` SELECT COALESCE(SUM(belanja), 0) AS total_spent, COALESCE(SUM(kunjungan), 0) AS total_visits, COUNT(*) AS entries FROM report`+whereSQL, args...).MapScan(summary); err != nil {
		return TenantReportRowsRes{}, err
	}
	res.Summary = normalizeReportRow(summary)
	return res, nil
}

func (r *Repository) ListTenantLedgerEntries(ctx context.Context, tenantID uuid.UUID, q ReportQuery) (TenantLedgerReportRes, error) {
	q, offset := reportQueryDefaults(q)
	base := `
		WITH report AS (
			SELECT *
			FROM tenant_ledger_entries
			WHERE tenant_id = $1
		)`
	whereSQL, args := buildReportWhere(q, reportFilterOptions{
		DateColumn:    "created_at",
		SearchColumns: []string{"source_ref", "midtrans_order_id", "midtrans_transaction_id", "transaction_status", "payment_type", "source_type", "status"},
		StatusColumns: []string{"status", "transaction_status"},
		MethodColumn:  "payment_type",
		SourceColumn:  "source_type",
	}, tenantID)

	var items []TenantLedgerEntry
	if err := r.db.SelectContext(ctx, &items, `
		`+base+`
		SELECT *
		FROM report`+whereSQL+`
		ORDER BY created_at DESC
		LIMIT $`+fmt.Sprint(len(args)+1)+` OFFSET $`+fmt.Sprint(len(args)+2),
		append(args, q.PageSize, offset)...,
	); err != nil {
		return TenantLedgerReportRes{}, err
	}

	var total int
	if err := r.db.GetContext(ctx, &total, `
		`+base+`
		SELECT COUNT(*)
		FROM report`+whereSQL,
		args...,
	); err != nil {
		return TenantLedgerReportRes{}, err
	}

	var summary TenantLedgerSummary
	if err := r.db.GetContext(ctx, &summary, `
		`+base+`
		SELECT
			COALESCE(SUM(CASE WHEN status = 'settled' AND direction = 'credit' THEN net_amount ELSE 0 END), 0)
				- COALESCE(SUM(CASE WHEN status = 'settled' AND direction = 'debit' THEN net_amount ELSE 0 END), 0) AS balance,
			COALESCE(SUM(CASE WHEN status = 'settled' AND direction = 'credit' THEN net_amount ELSE 0 END), 0) AS settled_credit,
			COALESCE(SUM(CASE WHEN status = 'settled' AND direction = 'debit' THEN net_amount ELSE 0 END), 0) AS settled_debit,
			COALESCE(SUM(CASE WHEN status = 'pending' AND direction = 'credit' THEN net_amount ELSE 0 END), 0) AS pending_credit,
			COALESCE(SUM(CASE WHEN status = 'pending' AND direction = 'debit' THEN net_amount ELSE 0 END), 0) AS pending_debit,
			COUNT(*) AS entries
		FROM report`+whereSQL,
		args...,
	); err != nil {
		return TenantLedgerReportRes{}, err
	}

	return TenantLedgerReportRes{Items: items, Total: total, Summary: summary}, nil
}

func (r *Repository) ListTenantMidtransNotifications(ctx context.Context, tenantID uuid.UUID, q ReportQuery) (TenantMidtransNotificationReportRes, error) {
	q, offset := reportQueryDefaults(q)
	base := `
		WITH report AS (
			SELECT *
			FROM midtrans_notification_logs
			WHERE tenant_id = $1
		)`
	whereSQL, args := buildReportWhere(q, reportFilterOptions{
		DateColumn:    "received_at",
		SearchColumns: []string{"order_id", "transaction_id", "transaction_status", "fraud_status", "payment_type", "processing_status", "error_message"},
		StatusColumns: []string{"transaction_status", "processing_status", "fraud_status"},
		MethodColumn:  "payment_type",
	}, tenantID)

	var items []MidtransNotificationLog
	if err := r.db.SelectContext(ctx, &items, `
		`+base+`
		SELECT *
		FROM report`+whereSQL+`
		ORDER BY received_at DESC
		LIMIT $`+fmt.Sprint(len(args)+1)+` OFFSET $`+fmt.Sprint(len(args)+2),
		append(args, q.PageSize, offset)...,
	); err != nil {
		return TenantMidtransNotificationReportRes{}, err
	}

	var total int
	if err := r.db.GetContext(ctx, &total, `
		`+base+`
		SELECT COUNT(*)
		FROM report`+whereSQL,
		args...,
	); err != nil {
		return TenantMidtransNotificationReportRes{}, err
	}

	return TenantMidtransNotificationReportRes{Items: items, Total: total}, nil
}

func (r *Repository) ListPendingManualPaymentAttempts(ctx context.Context, tenantID uuid.UUID) ([]BookingPaymentAttempt, error) {
	var items []BookingPaymentAttempt
	err := r.db.SelectContext(ctx, &items, `
		SELECT *
		FROM booking_payment_attempts
		WHERE tenant_id = $1
		  AND verification_type = 'manual'
		  AND status IN ('submitted', 'awaiting_verification')
		ORDER BY created_at DESC`,
		tenantID,
	)
	return items, err
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

func (r *Repository) GetBookingPaymentAttempt(ctx context.Context, exec sqlx.ExtContext, attemptID, tenantID uuid.UUID) (BookingPaymentAttempt, error) {
	var item BookingPaymentAttempt
	err := sqlx.GetContext(ctx, exec, &item, `
		SELECT *
		FROM booking_payment_attempts
		WHERE id = $1 AND tenant_id = $2
		LIMIT 1`,
		attemptID, tenantID,
	)
	return item, err
}

func buildReferenceCode(prefix string) string {
	return fmt.Sprintf("%s-%d", prefix, time.Now().UnixNano())
}

func decodePaymentMethodMetadata(raw []byte) map[string]any {
	if len(raw) == 0 {
		return map[string]any{}
	}
	var payload map[string]any
	if err := json.Unmarshal(raw, &payload); err != nil {
		return map[string]any{}
	}
	return payload
}

func (r *Repository) updatePromoRedemptionStatus(ctx context.Context, exec sqlx.ExtContext, bookingID uuid.UUID, status string) error {
	_, err := exec.ExecContext(ctx, `
		UPDATE tenant_promo_redemptions
		SET status = $2::varchar(20),
			redeemed_at = CASE
				WHEN $2::varchar(20) = 'redeemed' THEN COALESCE(redeemed_at, NOW())
				ELSE redeemed_at
			END
		WHERE booking_id = $1`,
		bookingID, status,
	)
	return err
}
