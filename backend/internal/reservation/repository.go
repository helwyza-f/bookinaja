package reservation

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"math"
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

func NewRepository(db *sqlx.DB, rdb ...*redis.Client) *Repository {
	var client *redis.Client
	if len(rdb) > 0 {
		client = rdb[0]
	}
	return &Repository{db: db, rdb: client}
}

func (r *Repository) cacheGet(ctx context.Context, key string, dest any) bool {
	if r.rdb == nil {
		return false
	}
	val, err := r.rdb.Get(ctx, key).Result()
	if err != nil {
		return false
	}
	return json.Unmarshal([]byte(val), dest) == nil
}

func (r *Repository) cacheSet(ctx context.Context, key string, value any, ttl time.Duration) {
	if r.rdb == nil {
		return
	}
	if raw, err := json.Marshal(value); err == nil {
		_ = r.rdb.Set(ctx, key, raw, ttl).Err()
	}
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

func reservationTenantPaymentMethodsCacheKey(tenantID uuid.UUID) string {
	return fmt.Sprintf("reservation:payment-methods:%s", tenantID.String())
}

func reservationTenantBookingsCacheKey(tenantID uuid.UUID, status string) string {
	status = strings.ToLower(strings.TrimSpace(status))
	if status == "" {
		status = "all"
	}
	return fmt.Sprintf("reservation:booking:list:%s:%s", tenantID.String(), status)
}

func bookingAnalyticsWindowStart(now time.Time, days int) time.Time {
	if days <= 0 {
		days = 30
	}
	return now.AddDate(0, 0, -(days - 1))
}

func (r *Repository) InvalidateBookingCache(ctx context.Context, booking Booking) {
	if r.rdb == nil {
		return
	}
	keys := []string{
		reservationActiveSessionsCacheKey(booking.TenantID),
		reservationTenantBookingsCacheKey(booking.TenantID, ""),
		reservationTenantBookingsCacheKey(booking.TenantID, booking.Status),
	}
	if booking.AccessToken != uuid.Nil {
		keys = append(keys, reservationPublicBookingCacheKey(booking.AccessToken))
	}
	if booking.CustomerID != uuid.Nil {
		keys = append(keys, reservationCustomerBookingCacheKey(booking.ID, booking.CustomerID))
	}
	keys = append(keys, reservationAdminBookingCacheKey(booking.ID, booking.TenantID))
	_ = r.rdb.Del(ctx, keys...).Err()
}

func (r *Repository) InvalidateBookingCacheByID(ctx context.Context, bookingID uuid.UUID) {
	if r.rdb == nil {
		return
	}
	var booking Booking
	if err := r.db.GetContext(ctx, &booking, `
		SELECT *
		FROM bookings
		WHERE id = $1
		LIMIT 1`, bookingID); err != nil {
		return
	}
	r.InvalidateBookingCache(ctx, booking)
}

type BookingEventInput struct {
	BookingID   uuid.UUID
	TenantID    uuid.UUID
	CustomerID  *uuid.UUID
	ActorUserID *uuid.UUID
	ActorType   string
	ActorName   string
	ActorEmail  string
	ActorRole   string
	EventType   string
	Title       string
	Description string
	Metadata    map[string]any
}

func (r *Repository) CreateBookingEvent(ctx context.Context, exec sqlx.ExtContext, input BookingEventInput) error {
	if input.ActorType == "" {
		input.ActorType = "system"
	}
	if input.Title == "" {
		input.Title = input.EventType
	}
	metadata, _ := json.Marshal(input.Metadata)
	if len(metadata) == 0 {
		metadata = []byte(`{}`)
	}
	_, err := exec.ExecContext(ctx, `
		INSERT INTO booking_events (
			id, booking_id, tenant_id, customer_id, actor_user_id, actor_type, actor_name, actor_email, actor_role, event_type, title, description, metadata, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW()
		)`,
		uuid.New(),
		input.BookingID,
		input.TenantID,
		input.CustomerID,
		input.ActorUserID,
		input.ActorType,
		input.ActorName,
		input.ActorEmail,
		input.ActorRole,
		input.EventType,
		input.Title,
		input.Description,
		metadata,
	)
	return err
}

func (r *Repository) GetTenantSlug(ctx context.Context, tenantID uuid.UUID) (string, error) {
	var slug string
	err := r.db.GetContext(ctx, &slug, `SELECT slug FROM tenants WHERE id = $1 LIMIT 1`, tenantID)
	if err != nil {
		return "", err
	}
	return slug, nil
}

func (r *Repository) GetTenantTimezone(ctx context.Context, tenantID uuid.UUID) (string, error) {
	var timezone string
	err := r.db.GetContext(ctx, &timezone, `
		SELECT COALESCE(NULLIF(BTRIM(timezone), ''), 'Asia/Jakarta')
		FROM tenants
		WHERE id = $1
		LIMIT 1`, tenantID)
	return timezone, err
}

func (r *Repository) GetTenantIDByBookingID(ctx context.Context, id uuid.UUID) (uuid.UUID, error) {
	var tID uuid.UUID
	err := r.db.GetContext(ctx, &tID, `SELECT tenant_id FROM bookings WHERE id = $1 LIMIT 1`, id)
	return tID, err
}

// GetOrCreateCustomer mengidentifikasi customer berdasarkan nomor HP (Silent Registration)
func (r *Repository) GetOrCreateCustomer(ctx context.Context, tenantID uuid.UUID, name, phone string) (uuid.UUID, error) {
	_ = tenantID
	var customerID uuid.UUID
	query := `
		INSERT INTO customers (
			id, name, phone, total_visits, total_spent, tier, loyalty_points,
			account_status, account_stage, registration_source, silent_registered_at,
			phone_verified_at, country_code, created_at, updated_at
		) VALUES (
			$1, $2, $3, 0, 0, 'NEW', 0,
			'verified', 'provisioned', 'booking', NOW(),
			NOW(), 'ID', NOW(), NOW()
		)
		ON CONFLICT (phone)
		DO UPDATE SET
			name = CASE
				WHEN COALESCE(BTRIM(customers.name), '') = '' THEN EXCLUDED.name
				ELSE customers.name
			END,
			silent_registered_at = COALESCE(customers.silent_registered_at, NOW()),
			registration_source = COALESCE(NULLIF(customers.registration_source, ''), 'booking'),
			account_stage = CASE
				WHEN COALESCE(customers.account_stage, '') = '' THEN 'provisioned'
				ELSE customers.account_stage
			END,
			updated_at = NOW()
		RETURNING id`
	if err := r.db.GetContext(ctx, &customerID, query, uuid.New(), name, phone); err != nil {
		return uuid.Nil, err
	}
	return customerID, nil
}

// CheckAvailability memastikan tidak ada bentrokan waktu pada resource tertentu
func (r *Repository) CheckAvailability(ctx context.Context, resourceID uuid.UUID, start, end time.Time) (bool, error) {
	var count int
	query := `
		SELECT COUNT(*) 
		FROM bookings 
		WHERE resource_id = $1 
		AND status NOT IN ('cancelled', 'rejected')
		AND (start_time, end_time) OVERLAPS ($2, $3)`

	err := r.db.GetContext(ctx, &count, query, resourceID, start, end)
	return count == 0, err
}

// ExtendSessionWithValidation memperbarui Quantity durasi paket utama dan billing secara atomik
func (r *Repository) ExtendSessionWithValidation(ctx context.Context, bID uuid.UUID, resourceID uuid.UUID, currentEnd, newEnd time.Time, additionalDuration int, actor ActorContext) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Validasi ketersediaan slot tambahan agar tidak menabrak booking lain
	var count int
	checkQuery := `
		SELECT COUNT(*) FROM bookings 
		WHERE resource_id = $1 AND id != $2 
		AND status NOT IN ('cancelled', 'rejected')
		AND start_time < $4 AND end_time > $3`

	err = tx.GetContext(ctx, &count, checkQuery, resourceID, bID, currentEnd, newEnd)
	if err != nil {
		return err
	}
	if count > 0 {
		return fmt.Errorf("SLOT WAKTU SUDAH TERISI")
	}

	// 2. Update jam selesai (END_TIME) pada tabel utama
	updateBookingQuery := `UPDATE bookings SET end_time = $1 WHERE id = $2`
	_, err = tx.ExecContext(ctx, updateBookingQuery, newEnd, bID)
	if err != nil {
		return err
	}

	// 3. Update Quantity & Subtotal pada Paket Utama (Bukan Insert Baru)
	updateOptionQuery := `
		UPDATE booking_options 
		SET 
			quantity = quantity + $2,
			price_at_booking = price_at_booking + (ri.price * $2)
		FROM resource_items ri 
		WHERE booking_options.resource_item_id = ri.id 
		AND booking_options.booking_id = $1 
		AND (ri.item_type = 'main_option' OR ri.item_type = 'console_option' OR ri.item_type = 'main')`

	_, err = tx.ExecContext(ctx, updateOptionQuery, bID, additionalDuration)
	if err != nil {
		return fmt.Errorf("gagal memperbarui durasi dan billing: %w", err)
	}

	if err := r.recalculateBookingTotalsTx(ctx, tx, bID); err != nil {
		return err
	}
	var booking Booking
	if err := tx.GetContext(ctx, &booking, `SELECT * FROM bookings WHERE id = $1 LIMIT 1`, bID); err != nil {
		return err
	}
	if err := r.CreateBookingEvent(ctx, tx, BookingEventInput{
		BookingID:   bID,
		TenantID:    booking.TenantID,
		CustomerID:  &booking.CustomerID,
		ActorUserID: actor.UserID,
		ActorType:   actor.Type,
		ActorName:   actor.Name,
		ActorEmail:  actor.Email,
		ActorRole:   actor.Role,
		EventType:   "session.extended",
		Title:       "Sesi diperpanjang",
		Description: fmt.Sprintf("Durasi ditambah %d sesi.", additionalDuration),
		Metadata:    map[string]any{"additional_duration": additionalDuration, "old_end_time": currentEnd, "new_end_time": newEnd},
	}); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}
	r.InvalidateBookingCacheByID(ctx, bID)
	return nil
}

// CreateWithItems menyimpan data booking beserta pilihan item dengan Quantity dinamis
func (r *Repository) CreateWithItems(ctx context.Context, b Booking, itemIDs []uuid.UUID, duration int, redemption *PromoRedemptionInput) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("repo: gagal memulai transaksi: %w", err)
	}
	defer tx.Rollback()

	queryBooking := `
		INSERT INTO bookings (
			id, tenant_id, customer_id, resource_id, start_time, end_time, access_token,
			status, promo_id, promo_code, original_grand_total, discount_amount, promo_snapshot,
			grand_total, deposit_amount, paid_amount, balance_due, payment_status, payment_method,
			session_activated_at, last_status_changed_at, created_at
		)
		VALUES (
			:id, :tenant_id, :customer_id, :resource_id, :start_time, :end_time, :access_token,
			:status, :promo_id, :promo_code, :original_grand_total, :discount_amount, :promo_snapshot,
			:grand_total, :deposit_amount, :paid_amount, :balance_due, :payment_status, :payment_method,
			:session_activated_at, :last_status_changed_at, :created_at
		)`

	_, err = tx.NamedExecContext(ctx, queryBooking, b)
	if err != nil {
		return err
	}

	if len(itemIDs) > 0 {
		queryItem := `
			INSERT INTO booking_options (id, booking_id, resource_item_id, quantity, price_at_booking)
			SELECT gen_random_uuid(), $1, id, 
				CASE 
					WHEN item_type = 'add_on' THEN 1 
					ELSE $4 
				END,
				CASE 
					WHEN item_type = 'add_on' THEN price 
					ELSE (price * $4) 
				END
			FROM resource_items WHERE id = $2 AND resource_id = $3`

		for _, itemID := range itemIDs {
			_, err = tx.ExecContext(ctx, queryItem, b.ID, itemID, b.ResourceID, duration)
			if err != nil {
				return err
			}
		}
	}
	if redemption != nil {
		_, err = tx.ExecContext(ctx, `
				INSERT INTO tenant_promo_redemptions (
					id, promo_id, tenant_id, booking_id, customer_id, promo_code, discount_amount,
					original_amount, final_amount, snapshot, status, redeemed_at, created_at
				) VALUES (
					$1, $2, $3, $4, $5, $6, $7,
					$8, $9, $10, $11::varchar(20),
					NOW(),
					NOW()
				)`,
			uuid.New(),
			redemption.PromoID,
			b.TenantID,
			b.ID,
			redemption.CustomerID,
			redemption.PromoCode,
			redemption.DiscountAmount,
			redemption.OriginalAmount,
			redemption.FinalAmount,
			redemption.SnapshotPayload,
			initialPromoRedemptionStatus(b),
		)
		if err != nil {
			return err
		}
	}
	createTitle := "Booking dibuat"
	createDescription := "Booking tercatat dan menunggu pembayaran DP."
	if b.Status == "active" && b.DepositAmount == 0 {
		createTitle = "Sesi walk-in dimulai"
		createDescription = "Sesi langsung aktif tanpa DP dan siap dilanjutkan ke POS."
	}
	if err := r.CreateBookingEvent(ctx, tx, BookingEventInput{
		BookingID:   b.ID,
		TenantID:    b.TenantID,
		CustomerID:  &b.CustomerID,
		ActorType:   "customer",
		EventType:   "booking.created",
		Title:       createTitle,
		Description: createDescription,
		Metadata:    map[string]any{"grand_total": b.GrandTotal, "deposit_amount": b.DepositAmount, "start_time": b.StartTime, "end_time": b.EndTime},
	}); err != nil {
		return err
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	r.InvalidateBookingCache(ctx, b)
	return nil
}

// FindByID menarik detail lengkap booking untuk Dashboard Admin & POS
func (r *Repository) FindByID(ctx context.Context, id, tenantID uuid.UUID) (*BookingDetail, error) {
	cacheKey := reservationAdminBookingCacheKey(id, tenantID)
	if tenantID != uuid.Nil {
		var cached BookingDetail
		if r.cacheGet(ctx, cacheKey, &cached) {
			return &cached, nil
		}
	}

	var b BookingDetail
	// Kita pake versi asli lo yang stabil, tapi kita lock DISTINCT biar gak duplikat item
	query := `
		SELECT 
			b.*, t.name as tenant_name, t.slug as tenant_slug,
			COALESCE(NULLIF(BTRIM(t.timezone), ''), 'Asia/Jakarta') as timezone,
			c.name as customer_name, c.phone as customer_phone, res.name as resource_name,
			COALESCE(ri.price, 0) as unit_price, 
			COALESCE(ri.unit_duration, 60) as unit_duration,
			-- Subquery tetap yang paling akurat buat totalan biaya
			COALESCE((SELECT SUM(price_at_booking) FROM booking_options WHERE booking_id = b.id), 0) as total_resource,
			COALESCE((SELECT SUM(price_at_purchase * quantity) FROM order_items WHERE booking_id = b.id), 0) as total_fnb
		FROM bookings b
		JOIN tenants t ON t.id = b.tenant_id
		JOIN customers c ON b.customer_id = c.id
		JOIN resources res ON b.resource_id = res.id
		LEFT JOIN booking_options bo ON bo.booking_id = b.id
		LEFT JOIN resource_items ri ON bo.resource_item_id = ri.id AND (ri.item_type = 'main_option' OR ri.item_type = 'console_option' OR ri.item_type = 'main')
		WHERE b.id = $1 AND b.tenant_id = $2
		LIMIT 1`

	err := r.db.GetContext(ctx, &b, query, id, tenantID)
	if err != nil {
		return nil, err
	}

	normalizeBookingFinancials(&b.Booking, b.TotalResource, b.TotalFnb)

	// Hydrate data relasi
	err = r.HydrateBooking(ctx, &b)
	if err == nil && tenantID != uuid.Nil {
		r.cacheSet(ctx, cacheKey, b, 2*time.Minute)
	}
	return &b, err
}

// HydrateBooking mengisi data relasi (options & orders) ke dalam objek BookingDetail
func (r *Repository) HydrateBooking(ctx context.Context, b *BookingDetail) error {
	paymentMethods, err := r.loadTenantPaymentMethods(ctx, b.TenantID)
	if err != nil {
		return err
	}
	b.PaymentMethods = paymentMethods

	b.PaymentAttempts = make([]BookingPaymentAttemptSummary, 0)
	if err := r.db.SelectContext(ctx, &b.PaymentAttempts, `
		SELECT id, method_code, method_label, verification_type, payment_scope, amount, status, reference_code, payer_note, admin_note, proof_url, created_at, submitted_at, verified_at, rejected_at
		FROM booking_payment_attempts
		WHERE booking_id = $1
		ORDER BY created_at DESC`, b.ID); err != nil {
		return err
	}

	// 1. Load Options (Layanan/Unit)
	b.Options = make([]BookingOptionDetail, 0)
	err = r.db.SelectContext(ctx, &b.Options, `
		SELECT 
			bo.id, ri.name as item_name, ri.item_type, 
			bo.price_at_booking, bo.quantity, ri.price as unit_price
		FROM booking_options bo
		JOIN resource_items ri ON bo.resource_item_id = ri.id
		WHERE bo.booking_id = $1
		ORDER BY bo.price_at_booking DESC`, b.ID)
	if err != nil {
		return err
	}

	// 2. Load F&B Orders
	b.Orders = make([]OrderItem, 0)
	err = r.db.SelectContext(ctx, &b.Orders, `
		SELECT oi.id, oi.booking_id, oi.fnb_item_id, f.name as item_name, oi.quantity, oi.price_at_purchase,
		(oi.quantity * oi.price_at_purchase) as subtotal
		FROM order_items oi
		JOIN fnb_items f ON oi.fnb_item_id = f.id
		WHERE oi.booking_id = $1
		ORDER BY oi.created_at DESC`, b.ID)
	if err != nil {
		return err
	}

	// 3. Load Katalog Addons
	b.ResourceAddons = make([]ResourceItemSimple, 0)
	err = r.db.SelectContext(ctx, &b.ResourceAddons, `
		SELECT id, name, price, item_type 
		FROM resource_items 
		WHERE resource_id = $1 AND item_type = 'add_on'
		ORDER BY name ASC`, b.ResourceID)
	if err != nil {
		return err
	}

	b.Events = make([]BookingEvent, 0)
	return r.db.SelectContext(ctx, &b.Events, `
		SELECT id, booking_id, tenant_id, customer_id, actor_user_id, actor_type, actor_name, actor_email, actor_role, event_type, title, description, metadata, created_at
		FROM booking_events
		WHERE booking_id = $1
		ORDER BY created_at ASC`, b.ID)
}

func (r *Repository) loadTenantPaymentMethods(ctx context.Context, tenantID uuid.UUID) ([]BookingPaymentMethod, error) {
	cacheKey := reservationTenantPaymentMethodsCacheKey(tenantID)
	var methods []BookingPaymentMethod
	if r.cacheGet(ctx, cacheKey, &methods) {
		return methods, nil
	}

	load := func() ([]BookingPaymentMethod, error) {
		methods = make([]BookingPaymentMethod, 0)
		err := r.db.SelectContext(ctx, &methods, `
			SELECT code, display_name, category, verification_type, provider, instructions, is_active, sort_order, metadata
			FROM tenant_payment_methods
			WHERE tenant_id = $1 AND is_active = true
			ORDER BY sort_order ASC, created_at ASC`, tenantID)
		return methods, err
	}

	methods, err := load()
	if err != nil {
		return nil, err
	}
	if len(methods) == 0 {
		if err := r.seedDefaultTenantPaymentMethods(ctx, tenantID); err != nil {
			return nil, err
		}
		methods, err = load()
		if err != nil {
			return nil, err
		}
	}

	r.cacheSet(ctx, cacheKey, methods, 5*time.Minute)
	return methods, nil
}

func (r *Repository) seedDefaultTenantPaymentMethods(ctx context.Context, tenantID uuid.UUID) error {
	now := time.Now().UTC()
	defaults := []BookingPaymentMethod{
		{Code: "midtrans", DisplayName: "Midtrans / QRIS Gateway", Category: "gateway", VerificationType: "auto", Provider: "midtrans", Instructions: "Pembayaran diverifikasi otomatis oleh gateway Midtrans.", IsActive: true, SortOrder: 10, Metadata: JSONB(`{}`)},
		{Code: "bank_transfer", DisplayName: "Transfer Bank", Category: "manual", VerificationType: "manual", Provider: "bank_transfer", Instructions: "Transfer ke rekening tenant lalu kirim bukti bayar untuk diverifikasi admin.", IsActive: false, SortOrder: 20, Metadata: JSONB(`{}`)},
		{Code: "qris_static", DisplayName: "QRIS Static", Category: "manual", VerificationType: "manual", Provider: "qris_static", Instructions: "Scan QRIS tenant lalu kirim bukti bayar untuk diverifikasi admin.", IsActive: false, SortOrder: 30, Metadata: JSONB(`{}`)},
		{Code: "cash", DisplayName: "Cash / Bayar di Tempat", Category: "manual", VerificationType: "manual", Provider: "cash", Instructions: "Pembayaran diterima langsung oleh admin atau kasir tenant.", IsActive: true, SortOrder: 40, Metadata: JSONB(`{}`)},
	}
	for _, item := range defaults {
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

// GetByToken menarik detail untuk pengecekan status tiket customer (Hydrated)
func (r *Repository) GetByToken(ctx context.Context, token uuid.UUID) (*BookingDetail, error) {
	cacheKey := reservationPublicBookingCacheKey(token)
	var cached BookingDetail
	if r.cacheGet(ctx, cacheKey, &cached) {
		return &cached, nil
	}

	var b BookingDetail
	query := `
		SELECT b.*, t.name as tenant_name, t.slug as tenant_slug,
		COALESCE(NULLIF(BTRIM(t.timezone), ''), 'Asia/Jakarta') as timezone,
		c.name as customer_name, c.phone as customer_phone, res.name as resource_name,
		COALESCE((SELECT SUM(price_at_booking) FROM booking_options WHERE booking_id = b.id), 0) as total_resource,
		COALESCE((SELECT SUM(price_at_purchase * quantity) FROM order_items WHERE booking_id = b.id), 0) as total_fnb
		FROM bookings b
		JOIN tenants t ON t.id = b.tenant_id
		JOIN customers c ON b.customer_id = c.id
		JOIN resources res ON b.resource_id = res.id
		WHERE b.access_token = $1 LIMIT 1`

	err := r.db.GetContext(ctx, &b, query, token)
	if err != nil {
		return nil, err
	}

	normalizeBookingFinancials(&b.Booking, b.TotalResource, b.TotalFnb)
	err = r.HydrateBooking(ctx, &b)
	if err == nil {
		r.cacheSet(ctx, cacheKey, b, 2*time.Minute)
	}
	return &b, err
}

func (r *Repository) FindByIDForCustomer(ctx context.Context, id, tenantID, customerID uuid.UUID) (*BookingDetail, error) {
	if tenantID == uuid.Nil {
		return r.FindByIDForCustomerGlobal(ctx, id, customerID)
	}

	cacheKey := reservationCustomerBookingCacheKey(id, customerID)
	var cached BookingDetail
	if r.cacheGet(ctx, cacheKey, &cached) {
		return &cached, nil
	}

	var b BookingDetail
	query := `
		SELECT 
			b.*, t.name as tenant_name, t.slug as tenant_slug,
			COALESCE(NULLIF(BTRIM(t.timezone), ''), 'Asia/Jakarta') as timezone,
			c.name as customer_name, c.phone as customer_phone, res.name as resource_name,
			COALESCE(ri.price, 0) as unit_price, 
			COALESCE(ri.unit_duration, 60) as unit_duration,
			COALESCE((SELECT SUM(price_at_booking) FROM booking_options WHERE booking_id = b.id), 0) as total_resource,
			COALESCE((SELECT SUM(price_at_purchase * quantity) FROM order_items WHERE booking_id = b.id), 0) as total_fnb
		FROM bookings b
		JOIN tenants t ON t.id = b.tenant_id
		JOIN customers c ON b.customer_id = c.id
		JOIN resources res ON b.resource_id = res.id
		LEFT JOIN booking_options bo ON bo.booking_id = b.id
		LEFT JOIN resource_items ri ON bo.resource_item_id = ri.id AND (ri.item_type = 'main_option' OR ri.item_type = 'console_option' OR ri.item_type = 'main')
		WHERE b.id = $1 AND b.tenant_id = $2 AND b.customer_id = $3
		LIMIT 1`

	err := r.db.GetContext(ctx, &b, query, id, tenantID, customerID)
	if err != nil {
		return nil, err
	}

	normalizeBookingFinancials(&b.Booking, b.TotalResource, b.TotalFnb)
	err = r.HydrateBooking(ctx, &b)
	if err == nil {
		r.cacheSet(ctx, cacheKey, b, 2*time.Minute)
	}
	return &b, err
}

func (r *Repository) FindByIDForCustomerGlobal(ctx context.Context, id, customerID uuid.UUID) (*BookingDetail, error) {
	cacheKey := reservationCustomerBookingCacheKey(id, customerID)
	var cached BookingDetail
	if r.cacheGet(ctx, cacheKey, &cached) {
		return &cached, nil
	}

	var b BookingDetail
	query := `
		SELECT 
			b.*, t.name as tenant_name, t.slug as tenant_slug,
			COALESCE(NULLIF(BTRIM(t.timezone), ''), 'Asia/Jakarta') as timezone,
			c.name as customer_name, c.phone as customer_phone, res.name as resource_name,
			COALESCE(ri.price, 0) as unit_price, 
			COALESCE(ri.unit_duration, 60) as unit_duration,
			COALESCE((SELECT SUM(price_at_booking) FROM booking_options WHERE booking_id = b.id), 0) as total_resource,
			COALESCE((SELECT SUM(price_at_purchase * quantity) FROM order_items WHERE booking_id = b.id), 0) as total_fnb
		FROM bookings b
		JOIN tenants t ON t.id = b.tenant_id
		JOIN customers c ON b.customer_id = c.id
		JOIN resources res ON b.resource_id = res.id
		LEFT JOIN booking_options bo ON bo.booking_id = b.id
		LEFT JOIN resource_items ri ON bo.resource_item_id = ri.id AND (ri.item_type = 'main_option' OR ri.item_type = 'console_option' OR ri.item_type = 'main')
		WHERE b.id = $1 AND b.customer_id = $2
		LIMIT 1`

	err := r.db.GetContext(ctx, &b, query, id, customerID)
	if err != nil {
		return nil, err
	}

	normalizeBookingFinancials(&b.Booking, b.TotalResource, b.TotalFnb)
	err = r.HydrateBooking(ctx, &b)
	if err == nil {
		r.cacheSet(ctx, cacheKey, b, 2*time.Minute)
	}
	return &b, err
}

func (r *Repository) AddFnbOrder(ctx context.Context, bookingID uuid.UUID, fnbItemID uuid.UUID, qty int, actor ActorContext) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	query := `
		INSERT INTO order_items (id, booking_id, fnb_item_id, quantity, price_at_purchase, status)
		SELECT gen_random_uuid(), b.id, f.id, $3, f.price, 'delivered'
		FROM bookings b
		JOIN fnb_items f ON f.id = $2 AND f.tenant_id = b.tenant_id
		WHERE b.id = $1`
	result, err := tx.ExecContext(ctx, query, bookingID, fnbItemID, qty)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("ITEM FNB TIDAK VALID UNTUK TENANT INI")
	}
	if err := r.recalculateBookingTotalsTx(ctx, tx, bookingID); err != nil {
		return err
	}
	var booking Booking
	if err := tx.GetContext(ctx, &booking, `SELECT * FROM bookings WHERE id = $1 LIMIT 1`, bookingID); err != nil {
		return err
	}
	if err := r.CreateBookingEvent(ctx, tx, BookingEventInput{
		BookingID:   bookingID,
		TenantID:    booking.TenantID,
		CustomerID:  &booking.CustomerID,
		ActorUserID: actor.UserID,
		ActorType:   actor.Type,
		ActorName:   actor.Name,
		ActorEmail:  actor.Email,
		ActorRole:   actor.Role,
		EventType:   "order.fnb_added",
		Title:       "F&B ditambahkan",
		Description: fmt.Sprintf("%d item F&B masuk ke tagihan.", qty),
		Metadata:    map[string]any{"fnb_item_id": fnbItemID, "quantity": qty},
	}); err != nil {
		return err
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	r.InvalidateBookingCacheByID(ctx, bookingID)
	return nil
}

func (r *Repository) AddAddonOrder(ctx context.Context, bookingID uuid.UUID, itemID uuid.UUID, actor ActorContext) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	query := `
		INSERT INTO booking_options (id, booking_id, resource_item_id, quantity, price_at_booking)
		SELECT gen_random_uuid(), b.id, ri.id, 1, ri.price
		FROM bookings b
		JOIN resource_items ri ON ri.id = $2 AND ri.resource_id = b.resource_id AND ri.item_type = 'add_on'
		WHERE b.id = $1`
	result, err := tx.ExecContext(ctx, query, bookingID, itemID)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("ADD-ON TIDAK VALID UNTUK RESOURCE INI")
	}
	if err := r.recalculateBookingTotalsTx(ctx, tx, bookingID); err != nil {
		return err
	}
	var booking Booking
	if err := tx.GetContext(ctx, &booking, `SELECT * FROM bookings WHERE id = $1 LIMIT 1`, bookingID); err != nil {
		return err
	}
	if err := r.CreateBookingEvent(ctx, tx, BookingEventInput{
		BookingID:   bookingID,
		TenantID:    booking.TenantID,
		CustomerID:  &booking.CustomerID,
		ActorUserID: actor.UserID,
		ActorType:   actor.Type,
		ActorName:   actor.Name,
		ActorEmail:  actor.Email,
		ActorRole:   actor.Role,
		EventType:   "addon.added",
		Title:       "Add-on ditambahkan",
		Description: "Layanan tambahan masuk ke tagihan.",
		Metadata:    map[string]any{"item_id": itemID},
	}); err != nil {
		return err
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	r.InvalidateBookingCacheByID(ctx, bookingID)
	return nil
}

func (r *Repository) recalculateBookingTotalsTx(ctx context.Context, exec sqlx.ExtContext, bookingID uuid.UUID) error {
	var booking Booking
	if err := sqlx.GetContext(ctx, exec, &booking, `
		SELECT * FROM bookings WHERE id = $1 LIMIT 1`, bookingID); err != nil {
		return err
	}

	var originalTotal float64
	if err := sqlx.GetContext(ctx, exec, &originalTotal, `
		SELECT
			COALESCE((SELECT SUM(price_at_booking) FROM booking_options WHERE booking_id = $1), 0)
			+ COALESCE((SELECT SUM(price_at_purchase * quantity) FROM order_items WHERE booking_id = $1), 0)`, bookingID); err != nil {
		return err
	}

	discountAmount := booking.DiscountAmount
	if shouldFloatPromoDiscount(booking.PromoSnapshot) {
		discountAmount = calculatePromoDiscountFromSnapshot(booking.PromoSnapshot, originalTotal)
	}
	grandTotal := math.Max(originalTotal-discountAmount, 0)
	paidAmount := booking.PaidAmount
	if booking.PaymentStatus == "partial_paid" || booking.PaymentStatus == "paid" || booking.PaymentStatus == "settled" {
		paidAmount = math.Max(booking.PaidAmount, booking.DepositAmount)
	}
	balanceDue := math.Max(grandTotal-paidAmount, 0)

	_, err := exec.ExecContext(ctx, `
		UPDATE bookings
		SET original_grand_total = $2,
			discount_amount = $3,
			grand_total = $4,
			paid_amount = $5,
			balance_due = $6
		WHERE id = $1`,
		bookingID, originalTotal, discountAmount, grandTotal, paidAmount, balanceDue,
	)
	if err != nil {
		return err
	}

	if shouldFloatPromoDiscount(booking.PromoSnapshot) && booking.PromoID != nil {
		updatedSnapshot, err := updatePromoSnapshotAmounts(booking.PromoSnapshot, originalTotal, discountAmount, grandTotal)
		if err != nil {
			return err
		}
		if _, err := exec.ExecContext(ctx, `
			UPDATE bookings
			SET promo_snapshot = $2
			WHERE id = $1`,
			bookingID, updatedSnapshot,
		); err != nil {
			return err
		}
		if _, err := exec.ExecContext(ctx, `
			UPDATE tenant_promo_redemptions
			SET discount_amount = $2,
				original_amount = $3,
				final_amount = $4,
				snapshot = $5
			WHERE booking_id = $1 AND promo_id = $6`,
			bookingID, discountAmount, originalTotal, grandTotal, updatedSnapshot, *booking.PromoID,
		); err != nil {
			return err
		}
	}
	return nil
}

func normalizeBookingFinancials(booking *Booking, totalResource, totalFnb float64) {
	if booking == nil {
		return
	}

	originalTotal := totalResource + totalFnb
	if shouldFloatPromoDiscount(booking.PromoSnapshot) {
		booking.DiscountAmount = calculatePromoDiscountFromSnapshot(booking.PromoSnapshot, originalTotal)
	}
	if booking.OriginalGrandTotal == nil || *booking.OriginalGrandTotal <= 0 {
		booking.OriginalGrandTotal = &originalTotal
	}

	computedGrandTotal := math.Max(originalTotal-booking.DiscountAmount, 0)
	if booking.GrandTotal <= 0 || shouldFloatPromoDiscount(booking.PromoSnapshot) {
		booking.GrandTotal = computedGrandTotal
	}

	if booking.PaymentStatus == "partial_paid" || booking.PaymentStatus == "paid" || booking.PaymentStatus == "settled" {
		booking.PaidAmount = math.Max(booking.PaidAmount, booking.DepositAmount)
	}
	if booking.BalanceDue <= 0 && booking.GrandTotal > 0 {
		booking.BalanceDue = booking.GrandTotal - booking.PaidAmount
		if booking.BalanceDue < 0 {
			booking.BalanceDue = 0
		}
	}
}

func (r *Repository) ResolveDepositPolicy(ctx context.Context, tenantID, resourceID uuid.UUID) (bool, float64, error) {
	type depositSetting struct {
		DPEnabled    bool    `db:"dp_enabled"`
		DPPercentage float64 `db:"dp_percentage"`
	}
	var resourceOverride struct {
		OverrideDP   bool    `db:"override_dp"`
		DPEnabled    bool    `db:"dp_enabled"`
		DPPercentage float64 `db:"dp_percentage"`
	}
	if err := r.db.GetContext(ctx, &resourceOverride, `
		SELECT override_dp, dp_enabled, dp_percentage
		FROM tenant_resource_deposit_overrides
		WHERE tenant_id = $1 AND resource_id = $2
		LIMIT 1`, tenantID, resourceID); err == nil {
		if resourceOverride.OverrideDP {
			return resourceOverride.DPEnabled, resourceOverride.DPPercentage, nil
		}
	} else if err != sql.ErrNoRows {
		return false, 0, err
	}

	var tenantSetting depositSetting
	if err := r.db.GetContext(ctx, &tenantSetting, `
		SELECT dp_enabled, dp_percentage
		FROM tenant_deposit_settings
		WHERE tenant_id = $1
		LIMIT 1`, tenantID); err == nil {
		return tenantSetting.DPEnabled, tenantSetting.DPPercentage, nil
	} else if err != sql.ErrNoRows {
		return false, 0, err
	}

	if _, err := r.db.ExecContext(ctx, `
		INSERT INTO tenant_deposit_settings (tenant_id, dp_enabled, dp_percentage, created_at, updated_at)
		VALUES ($1, true, 40, NOW(), NOW())
		ON CONFLICT (tenant_id) DO NOTHING`, tenantID); err != nil {
		return false, 0, err
	}
	return true, 40, nil
}

func updatePromoSnapshotAmounts(snapshot JSONB, originalTotal, discountAmount, finalAmount float64) (JSONB, error) {
	if len(snapshot) == 0 {
		return JSONB(`{}`), nil
	}
	var payload map[string]any
	if err := json.Unmarshal(snapshot, &payload); err != nil {
		return nil, err
	}
	payload["applied_discount_amount"] = discountAmount
	payload["original_amount"] = originalTotal
	payload["final_amount"] = finalAmount
	raw, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	return JSONB(raw), nil
}

func shouldFloatPromoDiscount(snapshot JSONB) bool {
	if len(snapshot) == 0 {
		return false
	}
	var payload map[string]any
	if err := json.Unmarshal(snapshot, &payload); err != nil {
		return false
	}
	return strings.EqualFold(toString(payload["discount_behavior"]), "floating")
}

func calculatePromoDiscountFromSnapshot(snapshot JSONB, originalTotal float64) float64 {
	if len(snapshot) == 0 || originalTotal <= 0 {
		return 0
	}
	var payload map[string]any
	if err := json.Unmarshal(snapshot, &payload); err != nil {
		return 0
	}
	discountType := strings.ToLower(toString(payload["discount_type"]))
	discountValue := toFloat(payload["discount_value"])
	maxDiscount := toFloat(payload["max_discount_amount"])

	var discount float64
	if discountType == "percentage" {
		discount = math.Round(originalTotal * discountValue / 100)
	} else {
		discount = math.Round(discountValue)
	}
	if maxDiscount > 0 && discount > maxDiscount {
		discount = maxDiscount
	}
	if discount > originalTotal {
		return originalTotal
	}
	return discount
}

func toFloat(value any) float64 {
	switch v := value.(type) {
	case float64:
		return v
	case int:
		return float64(v)
	case int64:
		return float64(v)
	case json.Number:
		f, _ := v.Float64()
		return f
	default:
		return 0
	}
}

func toString(value any) string {
	if text, ok := value.(string); ok {
		return strings.TrimSpace(text)
	}
	return ""
}

func (r *Repository) FindActiveSessions(ctx context.Context, tenantID uuid.UUID) ([]BookingDetail, error) {
	cacheKey := reservationActiveSessionsCacheKey(tenantID)
	var cached []BookingDetail
	if r.cacheGet(ctx, cacheKey, &cached) {
		return cached, nil
	}

	var res []BookingDetail
	query := `
		WITH option_totals AS (
			SELECT booking_id, COALESCE(SUM(price_at_booking), 0) AS total_resource
			FROM booking_options
			GROUP BY booking_id
		),
		order_totals AS (
			SELECT booking_id, COALESCE(SUM(price_at_purchase * quantity), 0) AS total_fnb
			FROM order_items
			GROUP BY booking_id
		)
		SELECT 
			b.*, t.name as tenant_name, t.slug as tenant_slug,
			COALESCE(NULLIF(BTRIM(t.timezone), ''), 'Asia/Jakarta') as timezone,
			c.name as customer_name, c.phone as customer_phone, res.name as resource_name,
			COALESCE(ot.total_resource, 0) as total_resource,
			COALESCE(ft.total_fnb, 0) as total_fnb
		FROM bookings b
		JOIN tenants t ON t.id = b.tenant_id
		JOIN customers c ON b.customer_id = c.id
		JOIN resources res ON b.resource_id = res.id
		LEFT JOIN option_totals ot ON ot.booking_id = b.id
		LEFT JOIN order_totals ft ON ft.booking_id = b.id
		WHERE b.tenant_id = $1
			AND (
				b.status IN ('active', 'ongoing')
				OR (
					b.status = 'completed'
					AND (
						COALESCE(b.balance_due, 0) > 0
						OR COALESCE(b.payment_status, '') IN ('pending', 'partial_paid', 'unpaid', 'failed', 'expired')
					)
				)
			)
		ORDER BY
			CASE
				WHEN b.status IN ('active', 'ongoing') THEN 0
				ELSE 1
			END,
			b.start_time ASC`

	err := r.db.SelectContext(ctx, &res, query, tenantID)
	if err != nil {
		return nil, err
	}

	for i := range res {
		normalizeBookingFinancials(&res[i].Booking, res[i].TotalResource, res[i].TotalFnb)
		// Catatan: Biasanya tidak perlu Hydrate penuh untuk view list agar hemat query
		res[i].Options = []BookingOptionDetail{}
		res[i].Orders = []OrderItem{}
	}
	r.cacheSet(ctx, cacheKey, res, 30*time.Second)
	return res, nil
}

func (r *Repository) UpdateStatus(ctx context.Context, id, tenantID uuid.UUID, status string, actor ActorContext) error {
	if status == "ongoing" {
		status = "active"
	}
	var before Booking
	if err := r.db.GetContext(ctx, &before, `SELECT * FROM bookings WHERE id = $1 AND tenant_id = $2 LIMIT 1`, id, tenantID); err != nil {
		return err
	}
	query := `
		UPDATE bookings
		SET
			status = $1::text,
			last_status_changed_at = NOW(),
			session_activated_at = CASE
				WHEN $1::text = 'active' AND session_activated_at IS NULL THEN NOW()
				ELSE session_activated_at
			END,
			completed_at = CASE
				WHEN $1::text = 'completed' AND completed_at IS NULL THEN NOW()
				ELSE completed_at
			END,
			cancelled_at = CASE
				WHEN $1::text = 'cancelled' AND cancelled_at IS NULL THEN NOW()
				ELSE cancelled_at
			END
		WHERE id = $2 AND tenant_id = $3`
	if _, err := r.db.ExecContext(ctx, query, status, id, tenantID); err != nil {
		return err
	}
	if redemptionStatus, ok := promoRedemptionStatusForBooking(status); ok {
		if err := r.updatePromoRedemptionStatus(ctx, r.db, id, redemptionStatus); err != nil {
			return err
		}
	}
	eventType := "booking.status_changed"
	title := "Status booking diperbarui"
	switch status {
	case "confirmed":
		eventType = "booking.confirmed"
		title = "Booking dikonfirmasi"
	case "active":
		eventType = "session.activated"
		title = "Sesi dimulai"
	case "completed":
		eventType = "session.completed"
		title = "Sesi selesai"
	case "cancelled":
		eventType = "booking.cancelled"
		title = "Booking dibatalkan"
	}
	if err := r.CreateBookingEvent(ctx, r.db, BookingEventInput{
		BookingID:   id,
		TenantID:    tenantID,
		CustomerID:  &before.CustomerID,
		ActorUserID: actor.UserID,
		ActorType:   actor.Type,
		ActorName:   actor.Name,
		ActorEmail:  actor.Email,
		ActorRole:   actor.Role,
		EventType:   eventType,
		Title:       title,
		Description: fmt.Sprintf("Status berubah dari %s ke %s.", before.Status, status),
		Metadata:    map[string]any{"from_status": before.Status, "to_status": status},
	}); err != nil {
		return err
	}
	r.InvalidateBookingCacheByID(ctx, id)
	return nil
}

func (r *Repository) RecordDepositByAdmin(ctx context.Context, id, tenantID uuid.UUID, notes string, actor ActorContext) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var before Booking
	if err := tx.GetContext(ctx, &before, `SELECT * FROM bookings WHERE id = $1 AND tenant_id = $2 LIMIT 1`, id, tenantID); err != nil {
		return err
	}

	now := time.Now().UTC()
	reference := fmt.Sprintf("ADMIN-DP-%d", now.UnixNano())
	actorName := strings.TrimSpace(actor.Name)
	if actorName == "" {
		actorName = "Admin"
	}
	adminNote := strings.TrimSpace(notes)
	if adminNote == "" {
		adminNote = "DP dicatat manual oleh admin tanpa menunggu upload customer."
	}

	if _, err := tx.ExecContext(ctx, `
		UPDATE bookings
		SET payment_status = CASE
				WHEN grand_total <= deposit_amount THEN 'settled'
				ELSE 'partial_paid'
			END,
			status = CASE
				WHEN status = 'pending' THEN 'confirmed'
				ELSE status
			END,
			payment_method = 'admin_recorded',
			paid_amount = GREATEST(paid_amount, deposit_amount),
			balance_due = GREATEST(grand_total - GREATEST(paid_amount, deposit_amount), 0),
			settled_at = CASE
				WHEN grand_total <= deposit_amount THEN COALESCE(settled_at, NOW())
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
		WHERE id = $1 AND tenant_id = $2`,
		id, tenantID,
	); err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO booking_payment_attempts (
			id, booking_id, tenant_id, customer_id, method_code, method_label, category, verification_type, payment_scope,
			amount, status, reference_code, payer_note, admin_note, metadata, submitted_at, verified_at, created_at, updated_at
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,$8,$9,
			$10,$11,$12,$13,$14,$15,$16,$17,$18,$19
		)`,
		uuid.New(), id, tenantID, before.CustomerID, "admin_recorded", "Admin recorded deposit", "manual", "manual", "deposit",
		int64(before.DepositAmount), "verified", reference, "Diterima langsung oleh admin", adminNote, []byte(`{"source":"admin_recorded"}`), now, now, now, now,
	); err != nil {
		return err
	}

	if err := r.updatePromoRedemptionStatus(ctx, tx, id, "redeemed"); err != nil {
		return err
	}

	if err := r.CreateBookingEvent(ctx, tx, BookingEventInput{
		BookingID:   id,
		TenantID:    tenantID,
		CustomerID:  &before.CustomerID,
		ActorUserID: actor.UserID,
		ActorType:   actor.Type,
		ActorName:   actor.Name,
		ActorEmail:  actor.Email,
		ActorRole:   actor.Role,
		EventType:   "payment.dp.recorded",
		Title:       "DP dicatat admin",
		Description: "Admin menandai DP sudah diterima dan booking siap dilanjutkan.",
		Metadata: map[string]any{
			"amount":    before.DepositAmount,
			"notes":     adminNote,
			"reference": reference,
		},
	}); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}
	r.InvalidateBookingCacheByID(ctx, id)
	return nil
}

func (r *Repository) OverrideDepositRequirement(ctx context.Context, id, tenantID uuid.UUID, reason string, actor ActorContext) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var before Booking
	if err := tx.GetContext(ctx, &before, `SELECT * FROM bookings WHERE id = $1 AND tenant_id = $2 LIMIT 1`, id, tenantID); err != nil {
		return err
	}

	overrideReason := strings.TrimSpace(reason)
	if overrideReason == "" {
		overrideReason = "Sesi diizinkan mulai sebelum DP masuk. Perlu follow-up pembayaran."
	}
	overrideBy := strings.TrimSpace(actor.Name)
	if overrideBy == "" {
		overrideBy = strings.TrimSpace(actor.Email)
	}
	if overrideBy == "" {
		overrideBy = "Admin"
	}

	if _, err := tx.ExecContext(ctx, `
		UPDATE bookings
		SET deposit_override_active = true,
			deposit_override_reason = $3,
			deposit_override_by = $4,
			deposit_override_at = NOW()
		WHERE id = $1 AND tenant_id = $2`,
		id, tenantID, overrideReason, overrideBy,
	); err != nil {
		return err
	}

	if err := r.CreateBookingEvent(ctx, tx, BookingEventInput{
		BookingID:   id,
		TenantID:    tenantID,
		CustomerID:  &before.CustomerID,
		ActorUserID: actor.UserID,
		ActorType:   actor.Type,
		ActorName:   actor.Name,
		ActorEmail:  actor.Email,
		ActorRole:   actor.Role,
		EventType:   "booking.dp_override.enabled",
		Title:       "Override DP diaktifkan",
		Description: "Admin mengizinkan sesi dimulai sebelum DP tercatat.",
		Metadata: map[string]any{
			"reason":      overrideReason,
			"override_by": overrideBy,
		},
	}); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}
	r.InvalidateBookingCacheByID(ctx, id)
	return nil
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

func initialPromoRedemptionStatus(booking Booking) string {
	if strings.EqualFold(strings.TrimSpace(booking.Status), "active") {
		return "redeemed"
	}
	return "reserved"
}

func promoRedemptionStatusForBooking(status string) (string, bool) {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "active", "completed":
		return "redeemed", true
	case "cancelled":
		return "released", true
	default:
		return "", false
	}
}

func (r *Repository) SettlePaymentCash(ctx context.Context, id, tenantID uuid.UUID, actor ActorContext, cashReceived *float64, notes *string) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	var booking Booking
	if err := tx.GetContext(ctx, &booking, `SELECT * FROM bookings WHERE id = $1 AND tenant_id = $2 LIMIT 1`, id, tenantID); err != nil {
		return err
	}
	query := `
		UPDATE bookings
		SET payment_status = 'settled',
			payment_method = 'cash',
			paid_amount = grand_total,
			balance_due = 0,
			settled_at = COALESCE(settled_at, NOW()),
			deposit_override_active = false,
			deposit_override_reason = NULL,
			deposit_override_by = NULL,
			deposit_override_at = NULL
		WHERE id = $1 AND tenant_id = $2`
	if _, err := tx.ExecContext(ctx, query, id, tenantID); err != nil {
		return err
	}
	if err := r.CreateBookingEvent(ctx, tx, BookingEventInput{
		BookingID:   id,
		TenantID:    tenantID,
		CustomerID:  &booking.CustomerID,
		ActorUserID: actor.UserID,
		ActorType:   actor.Type,
		ActorName:   actor.Name,
		ActorEmail:  actor.Email,
		ActorRole:   actor.Role,
		EventType:   "payment.cash.settled",
		Title:       "Pembayaran cash lunas",
		Description: "Admin menandai tagihan booking sudah lunas via cash.",
		Metadata:    map[string]any{"payment_method": "cash"},
	}); err != nil {
		return err
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	r.InvalidateBookingCacheByID(ctx, id)
	return nil
}

func (r *Repository) UpdateSessionActivatedAt(ctx context.Context, id, tenantID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE bookings
		SET session_activated_at = NOW(), last_status_changed_at = COALESCE(last_status_changed_at, NOW())
		WHERE id = $1 AND tenant_id = $2 AND session_activated_at IS NULL`,
		id, tenantID,
	)
	if err == nil {
		r.InvalidateBookingCacheByID(ctx, id)
	}
	return err
}

func (r *Repository) MarkReminderSent(ctx context.Context, id, tenantID uuid.UUID, field string) error {
	if field != "reminder_20m_sent_at" && field != "reminder_5m_sent_at" {
		return fmt.Errorf("invalid reminder field")
	}
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	var booking Booking
	if err := tx.GetContext(ctx, &booking, `SELECT * FROM bookings WHERE id = $1 AND tenant_id = $2 LIMIT 1`, id, tenantID); err != nil {
		return err
	}
	query := fmt.Sprintf(`UPDATE bookings SET %s = NOW() WHERE id = $1 AND tenant_id = $2 AND %s IS NULL`, field, field)
	result, err := tx.ExecContext(ctx, query, id, tenantID)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows > 0 {
		minutes := 20
		if field == "reminder_5m_sent_at" {
			minutes = 5
		}
		if err := r.CreateBookingEvent(ctx, tx, BookingEventInput{
			BookingID:   id,
			TenantID:    tenantID,
			CustomerID:  &booking.CustomerID,
			ActorType:   "system",
			EventType:   fmt.Sprintf("reminder.%dm.sent", minutes),
			Title:       fmt.Sprintf("Reminder %d menit terkirim", minutes),
			Description: "Sistem mengirim pengingat sesi ke customer.",
			Metadata:    map[string]any{"minutes_before_start": minutes},
		}); err != nil {
			return err
		}
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	r.InvalidateBookingCacheByID(ctx, id)
	return nil
}

func (r *Repository) ListUpcoming(ctx context.Context, resourceID uuid.UUID, from time.Time) ([]Booking, error) {
	var bookings []Booking
	query := `SELECT * FROM bookings WHERE resource_id = $1 AND end_time > $2 AND status != 'cancelled' ORDER BY start_time ASC`
	err := r.db.SelectContext(ctx, &bookings, query, resourceID, from)
	return bookings, err
}

func (r *Repository) FindAllByTenant(ctx context.Context, tenantID uuid.UUID, status string) ([]BookingDetail, error) {
	cacheKey := reservationTenantBookingsCacheKey(tenantID, status)
	var cached []BookingDetail
	if r.cacheGet(ctx, cacheKey, &cached) {
		return cached, nil
	}

	var res []BookingDetail
	query := `
		SELECT b.*, t.name as tenant_name, t.slug as tenant_slug,
		COALESCE(NULLIF(BTRIM(t.timezone), ''), 'Asia/Jakarta') as timezone,
		c.name as customer_name, c.phone as customer_phone, res.name as resource_name,
		COALESCE((SELECT SUM(price_at_booking) FROM booking_options WHERE booking_id = b.id), 0) as total_resource,
		COALESCE((SELECT SUM(price_at_purchase * quantity) FROM order_items WHERE booking_id = b.id), 0) as total_fnb
		FROM bookings b
		JOIN tenants t ON t.id = b.tenant_id
		JOIN customers c ON b.customer_id = c.id
		JOIN resources res ON b.resource_id = res.id
		WHERE b.tenant_id = $1`

	if status != "" {
		query += " AND b.status = $2"
		err := r.db.SelectContext(ctx, &res, query+" ORDER BY b.created_at DESC", tenantID, status)
		return res, err
	}

	err := r.db.SelectContext(ctx, &res, query+" ORDER BY b.created_at DESC", tenantID)
	if err != nil {
		return nil, err
	}

	for i := range res {
		normalizeBookingFinancials(&res[i].Booking, res[i].TotalResource, res[i].TotalFnb)
	}
	r.cacheSet(ctx, cacheKey, res, 30*time.Second)
	return res, nil
}

func (r *Repository) GetAnalyticsSummary(ctx context.Context, tenantID uuid.UUID, days int) (*BookingAnalyticsSummary, error) {
	startAt := bookingAnalyticsWindowStart(time.Now().UTC(), days)

	type summaryRow struct {
		Revenue       float64 `db:"revenue"`
		AddonRevenue  float64 `db:"addon_revenue"`
		BookingsCount int     `db:"bookings_count"`
	}

	var totals summaryRow
	if err := r.db.GetContext(ctx, &totals, `
		WITH order_totals AS (
			SELECT
				booking_id,
				COALESCE(SUM(price_at_purchase * quantity), 0) AS total_fnb
			FROM order_items
			GROUP BY booking_id
		)
		SELECT
			COALESCE(SUM(COALESCE(b.grand_total, 0)), 0) AS revenue,
			COALESCE(SUM(COALESCE(ot.total_fnb, 0)), 0) AS addon_revenue,
			COUNT(*) AS bookings_count
		FROM bookings b
		LEFT JOIN order_totals ot ON ot.booking_id = b.id
		WHERE b.tenant_id = $1
			AND COALESCE(b.start_time, b.created_at) >= $2
	`, tenantID, startAt); err != nil {
		return nil, err
	}

	dailySeries := make([]BookingAnalyticsDailyPoint, 0, days)
	if err := r.db.SelectContext(ctx, &dailySeries, `
		WITH tenant_meta AS (
			SELECT COALESCE(NULLIF(BTRIM(timezone), ''), 'Asia/Jakarta') AS timezone
			FROM tenants
			WHERE id = $1
			LIMIT 1
		),
		calendar AS (
			SELECT (
				(CURRENT_TIMESTAMP AT TIME ZONE (SELECT timezone FROM tenant_meta))::date - (($3 - 1) - day_offset)
			)::date AS local_day
			FROM generate_series(0, $3 - 1) AS series(day_offset)
		),
		booking_daily AS (
			SELECT
				DATE(COALESCE(b.start_time, b.created_at) AT TIME ZONE (SELECT timezone FROM tenant_meta)) AS local_day,
				COALESCE(SUM(COALESCE(b.grand_total, 0)), 0) AS revenue,
				COUNT(*) AS bookings_count
			FROM bookings b
			WHERE b.tenant_id = $1
				AND COALESCE(b.start_time, b.created_at) >= $2
			GROUP BY 1
		)
		SELECT
			TO_CHAR(c.local_day, 'YYYY-MM-DD') AS date,
			TO_CHAR(c.local_day, 'DD/MM') AS label,
			COALESCE(bd.revenue, 0) AS revenue,
			COALESCE(bd.bookings_count, 0) AS bookings_count
		FROM calendar c
		LEFT JOIN booking_daily bd ON bd.local_day = c.local_day
		ORDER BY c.local_day ASC
	`, tenantID, startAt, days); err != nil {
		return nil, err
	}

	recentBookings := make([]BookingAnalyticsRecentBooking, 0, 8)
	if err := r.db.SelectContext(ctx, &recentBookings, `
		WITH order_totals AS (
			SELECT
				booking_id,
				COALESCE(SUM(price_at_purchase * quantity), 0) AS total_fnb
			FROM order_items
			GROUP BY booking_id
		)
		SELECT
			b.id,
			c.name AS customer_name,
			r.name AS resource_name,
			b.start_time,
			b.created_at,
			COALESCE(b.payment_status, '') AS payment_status,
			COALESCE(b.grand_total, 0) AS grand_total,
			COALESCE(ot.total_fnb, 0) AS total_fnb
		FROM bookings b
		JOIN customers c ON c.id = b.customer_id
		JOIN resources r ON r.id = b.resource_id
		LEFT JOIN order_totals ot ON ot.booking_id = b.id
		WHERE b.tenant_id = $1
			AND COALESCE(b.start_time, b.created_at) >= $2
		ORDER BY COALESCE(b.start_time, b.created_at) DESC, b.created_at DESC
		LIMIT 8
	`, tenantID, startAt); err != nil {
		return nil, err
	}

	addonBookings := make([]BookingAnalyticsRecentBooking, 0, 6)
	if err := r.db.SelectContext(ctx, &addonBookings, `
		WITH order_totals AS (
			SELECT
				booking_id,
				COALESCE(SUM(price_at_purchase * quantity), 0) AS total_fnb
			FROM order_items
			GROUP BY booking_id
		)
		SELECT
			b.id,
			c.name AS customer_name,
			r.name AS resource_name,
			b.start_time,
			b.created_at,
			COALESCE(b.payment_status, '') AS payment_status,
			COALESCE(b.grand_total, 0) AS grand_total,
			COALESCE(ot.total_fnb, 0) AS total_fnb
		FROM bookings b
		JOIN customers c ON c.id = b.customer_id
		JOIN resources r ON r.id = b.resource_id
		JOIN order_totals ot ON ot.booking_id = b.id
		WHERE b.tenant_id = $1
			AND COALESCE(b.start_time, b.created_at) >= $2
			AND COALESCE(ot.total_fnb, 0) > 0
		ORDER BY ot.total_fnb DESC, COALESCE(b.start_time, b.created_at) DESC
		LIMIT 6
	`, tenantID, startAt); err != nil {
		return nil, err
	}

	resourceLeaders := make([]BookingAnalyticsResourceStat, 0, 8)
	if err := r.db.SelectContext(ctx, &resourceLeaders, `
		SELECT
			b.resource_id AS id,
			r.name,
			COUNT(*) AS bookings_count,
			COALESCE(SUM(COALESCE(b.grand_total, 0)), 0) AS revenue,
			MAX(COALESCE(b.start_time, b.created_at)) AS last_booking_at
		FROM bookings b
		JOIN resources r ON r.id = b.resource_id
		WHERE b.tenant_id = $1
			AND COALESCE(b.start_time, b.created_at) >= $2
		GROUP BY b.resource_id, r.name
		ORDER BY revenue DESC, bookings_count DESC
		LIMIT 8
	`, tenantID, startAt); err != nil {
		return nil, err
	}

	averageTicket := 0.0
	if totals.BookingsCount > 0 {
		averageTicket = totals.Revenue / float64(totals.BookingsCount)
	}

	return &BookingAnalyticsSummary{
		Revenue:         totals.Revenue,
		AddonRevenue:    totals.AddonRevenue,
		BookingsCount:   totals.BookingsCount,
		AverageTicket:   averageTicket,
		DailySeries:     dailySeries,
		ResourceLeaders: resourceLeaders,
		RecentBookings:  recentBookings,
		AddonBookings:   addonBookings,
	}, nil
}

func (r *Repository) GetReceiptContext(ctx context.Context, bookingID, tenantID uuid.UUID) (*ReceiptContext, error) {
	var receipt ReceiptContext
	query := `
		SELECT
			b.*,
			t.name AS tenant_name,
			t.plan AS tenant_plan,
			t.subscription_status AS tenant_status,
			COALESCE(NULLIF(BTRIM(t.timezone), ''), 'Asia/Jakarta') AS timezone,
			COALESCE((
				SELECT NULLIF(BTRIM(be.actor_name), '')
				FROM booking_events be
				WHERE be.booking_id = b.id
					AND be.actor_type = 'admin'
					AND NULLIF(BTRIM(be.actor_name), '') IS NOT NULL
					AND be.event_type IN (
						'payment.cash.settled',
						'payment.dp.recorded',
						'session.activated',
						'session.completed',
						'session.extended',
						'booking.created'
					)
				ORDER BY be.created_at DESC
				LIMIT 1
			), 'Admin') AS cashier_name,
			t.receipt_title,
			t.receipt_subtitle,
			t.receipt_footer,
			t.receipt_whatsapp_text,
			t.receipt_template,
			c.name AS customer_name,
			c.phone AS customer_phone,
			res.name AS resource_name,
			COALESCE((SELECT SUM(price_at_booking) FROM booking_options WHERE booking_id = b.id), 0) AS total_resource,
			COALESCE((SELECT SUM(price_at_purchase * quantity) FROM order_items WHERE booking_id = b.id), 0) AS total_fnb
		FROM bookings b
		JOIN tenants t ON t.id = b.tenant_id
		JOIN customers c ON c.id = b.customer_id
		JOIN resources res ON res.id = b.resource_id
		WHERE b.id = $1 AND b.tenant_id = $2
		LIMIT 1`
	if err := r.db.GetContext(ctx, &receipt, query, bookingID, tenantID); err != nil {
		return nil, err
	}
	normalizeBookingFinancials(&receipt.Booking, receipt.TotalResource, receipt.TotalFnb)

	receipt.Options = make([]BookingOptionDetail, 0)
	if err := r.db.SelectContext(ctx, &receipt.Options, `
		SELECT
			bo.id, ri.name as item_name, ri.item_type,
			bo.price_at_booking, bo.quantity, ri.price as unit_price
		FROM booking_options bo
		JOIN resource_items ri ON bo.resource_item_id = ri.id
		WHERE bo.booking_id = $1
		ORDER BY bo.price_at_booking DESC`, receipt.ID); err != nil {
		return nil, err
	}

	receipt.Orders = make([]OrderItem, 0)
	if err := r.db.SelectContext(ctx, &receipt.Orders, `
		SELECT oi.id, oi.booking_id, oi.fnb_item_id, f.name as item_name, oi.quantity, oi.price_at_purchase,
		(oi.quantity * oi.price_at_purchase) as subtotal
		FROM order_items oi
		JOIN fnb_items f ON oi.fnb_item_id = f.id
		WHERE oi.booking_id = $1
		ORDER BY oi.created_at DESC`, receipt.ID); err != nil {
		return nil, err
	}

	return &receipt, nil
}
