package customer

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
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

func (r *Repository) InvalidateTenantCache(ctx context.Context, tenantID uuid.UUID) {
	if r.rdb == nil {
		return
	}
	patterns := []string{
		fmt.Sprintf("customer:tenant:%s", tenantID.String()),
		fmt.Sprintf("customer:legacy:%s", tenantID.String()),
		fmt.Sprintf("customer:broadcast:%s:*", tenantID.String()),
	}
	for _, pattern := range patterns {
		if strings.Contains(pattern, "*") {
			keys, err := r.rdb.Keys(ctx, pattern).Result()
			if err == nil && len(keys) > 0 {
				_ = r.rdb.Del(ctx, keys...).Err()
			}
			continue
		}
		_ = r.rdb.Del(ctx, pattern).Err()
	}
}

func (r *Repository) InvalidateCustomerMembershipCache(ctx context.Context, customerID uuid.UUID) {
	if r.rdb == nil {
		return
	}
	var tenantIDs []uuid.UUID
	err := r.db.SelectContext(ctx, &tenantIDs, `
		SELECT DISTINCT tenant_id
		FROM bookings
		WHERE customer_id = $1`, customerID)
	if err != nil {
		return
	}
	for _, tenantID := range tenantIDs {
		r.InvalidateTenantCache(ctx, tenantID)
	}
}

// Upsert menangani Silent Register: Insert jika HP baru, Update nama sesuai request.
func (r *Repository) Upsert(ctx context.Context, c Customer) (uuid.UUID, error) {
	query := `
		INSERT INTO customers (
			id, name, phone, email, password,
			total_visits, total_spent, tier, loyalty_points,
			account_status, account_stage, registration_source, phone_verified_at,
			silent_registered_at, profile_completed_at, marketing_opt_in,
			birth_date, gender, city, province, country_code, google_subject,
			last_login_method, last_login_at,
			created_at, updated_at
		)
		VALUES (
			$1, $2, $3, $4, $5,
			0, 0, 'NEW', 0,
			$6, $7, $8, $9,
			$10, $11, $12,
			$13, $14, $15, $16, $17, $18,
			$19, $20,
			NOW(), NOW()
		)
		ON CONFLICT (phone)
		DO UPDATE SET
			name = CASE
				WHEN COALESCE(BTRIM(customers.name), '') = '' THEN EXCLUDED.name
				ELSE customers.name
			END,
			email = COALESCE(EXCLUDED.email, customers.email),
			password = COALESCE(EXCLUDED.password, customers.password),
			account_status = COALESCE(EXCLUDED.account_status, customers.account_status),
			account_stage = CASE
				WHEN customers.account_stage = 'suspended' THEN customers.account_stage
				ELSE COALESCE(EXCLUDED.account_stage, customers.account_stage)
			END,
			registration_source = COALESCE(NULLIF(customers.registration_source, ''), EXCLUDED.registration_source),
			phone_verified_at = COALESCE(EXCLUDED.phone_verified_at, customers.phone_verified_at),
			silent_registered_at = COALESCE(customers.silent_registered_at, EXCLUDED.silent_registered_at),
			profile_completed_at = COALESCE(EXCLUDED.profile_completed_at, customers.profile_completed_at),
			marketing_opt_in = customers.marketing_opt_in OR EXCLUDED.marketing_opt_in,
			birth_date = COALESCE(EXCLUDED.birth_date, customers.birth_date),
			gender = COALESCE(EXCLUDED.gender, customers.gender),
			city = COALESCE(EXCLUDED.city, customers.city),
			province = COALESCE(EXCLUDED.province, customers.province),
			country_code = COALESCE(NULLIF(EXCLUDED.country_code, ''), customers.country_code),
			google_subject = COALESCE(EXCLUDED.google_subject, customers.google_subject),
			last_login_method = COALESCE(EXCLUDED.last_login_method, customers.last_login_method),
			last_login_at = COALESCE(EXCLUDED.last_login_at, customers.last_login_at),
			updated_at = NOW()
		RETURNING id`

	var id uuid.UUID
	err := r.db.QueryRowContext(ctx, query,
		c.ID, c.Name, c.Phone, c.Email, c.Password,
		c.AccountStatus, c.AccountStage, c.RegistrationSource, c.PhoneVerifiedAt,
		c.SilentRegisteredAt, c.ProfileCompletedAt, c.MarketingOptIn,
		c.BirthDate, c.Gender, c.City, c.Province, c.CountryCode, c.GoogleSubject,
		c.LastLoginMethod, c.LastLoginAt,
	).Scan(&id)

	if err != nil {
		return uuid.Nil, wrapCustomerRepoErr("repo: gagal upsert customer", err)
	}
	if c.TenantID != nil {
		r.InvalidateTenantCache(ctx, *c.TenantID)
	}
	return id, nil
}

func (r *Repository) UpsertPendingRegistration(ctx context.Context, c Customer) (uuid.UUID, error) {
	query := `
		INSERT INTO customers (
			id, name, phone, email, password, avatar_url,
			total_visits, total_spent, tier, loyalty_points,
			account_status, account_stage, registration_source, phone_verified_at,
			marketing_opt_in, birth_date, gender, city, province, country_code,
			google_subject,
			created_at, updated_at
		)
		VALUES (
			$1, $2, $3, $4, $5, $6,
			0, 0, 'NEW', 0,
			'unverified', 'provisioned', $7, NULL,
			$8, $9, $10, $11, $12, $13, $14,
			NOW(), NOW()
		)
		ON CONFLICT (phone)
		DO UPDATE SET
			name = EXCLUDED.name,
			email = COALESCE(EXCLUDED.email, customers.email),
			password = COALESCE(EXCLUDED.password, customers.password),
			avatar_url = COALESCE(customers.avatar_url, EXCLUDED.avatar_url),
			account_status = 'unverified',
			account_stage = CASE
				WHEN customers.account_stage = 'suspended' THEN customers.account_stage
				ELSE 'provisioned'
			END,
			registration_source = CASE
				WHEN COALESCE(customers.registration_source, '') = '' THEN EXCLUDED.registration_source
				ELSE customers.registration_source
			END,
			phone_verified_at = NULL,
			marketing_opt_in = customers.marketing_opt_in OR EXCLUDED.marketing_opt_in,
			birth_date = COALESCE(EXCLUDED.birth_date, customers.birth_date),
			gender = COALESCE(EXCLUDED.gender, customers.gender),
			city = COALESCE(EXCLUDED.city, customers.city),
			province = COALESCE(EXCLUDED.province, customers.province),
			country_code = COALESCE(NULLIF(EXCLUDED.country_code, ''), customers.country_code),
			google_subject = COALESCE(EXCLUDED.google_subject, customers.google_subject),
			updated_at = NOW()
		WHERE COALESCE(customers.account_status, 'verified') != 'verified'
		   OR COALESCE(customers.account_stage, 'provisioned') = 'provisioned'
		RETURNING id`

	var id uuid.UUID
	err := r.db.QueryRowContext(
		ctx,
		query,
		c.ID,
		c.Name,
		c.Phone,
		c.Email,
		c.Password,
		c.AvatarURL,
		c.RegistrationSource,
		c.MarketingOptIn,
		c.BirthDate,
		c.Gender,
		c.City,
		c.Province,
		c.CountryCode,
		c.GoogleSubject,
	).Scan(&id)
	if err != nil {
		return uuid.Nil, wrapCustomerRepoErr("repo: gagal simpan registrasi pending", err)
	}
	return id, nil
}

func (r *Repository) UpsertImportedCustomer(ctx context.Context, c Customer) (bool, error) {
	query := `
		INSERT INTO customers (
			id, name, phone, email, password,
			total_visits, total_spent, tier, loyalty_points,
			account_status, phone_verified_at,
			created_at, updated_at
		)
		VALUES (
			$1, $2, $3, $4, $5,
			0, 0, 'NEW', 0,
			'verified', NOW(),
			NOW(), NOW()
		)
		ON CONFLICT (phone)
		DO UPDATE SET
			name = EXCLUDED.name,
			email = COALESCE(EXCLUDED.email, customers.email),
			password = COALESCE(EXCLUDED.password, customers.password),
			account_status = 'verified',
			phone_verified_at = COALESCE(customers.phone_verified_at, NOW()),
			updated_at = NOW()`

	result, err := r.db.ExecContext(ctx, query,
		c.ID, c.Name, c.Phone, c.Email, c.Password,
	)
	if err != nil {
		return false, wrapCustomerRepoErr("repo: gagal import customer", err)
	}
	rows, _ := result.RowsAffected()
	return rows > 0, nil
}

func (r *Repository) UpsertLegacyContact(ctx context.Context, tenantID uuid.UUID, row CustomerImportRow) (bool, error) {
	query := `
		INSERT INTO legacy_customer_contacts (
			id, tenant_id, name, phone, source, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, 'migration', NOW(), NOW()
		)
		ON CONFLICT (tenant_id, phone)
		DO UPDATE SET
			name = EXCLUDED.name,
			source = EXCLUDED.source,
			updated_at = NOW()`
	result, err := r.db.ExecContext(ctx, query, uuid.New(), tenantID, row.Name, row.Phone)
	if err != nil {
		return false, wrapCustomerRepoErr("repo: gagal simpan pelanggan lama", err)
	}
	rows, _ := result.RowsAffected()
	r.InvalidateTenantCache(ctx, tenantID)
	return rows > 0, nil
}

func (r *Repository) ListLegacyContacts(ctx context.Context, tenantID uuid.UUID) ([]LegacyCustomerContact, error) {
	var contacts []LegacyCustomerContact
	if r.cacheGet(ctx, fmt.Sprintf("customer:legacy:%s", tenantID.String()), &contacts) {
		return contacts, nil
	}
	err := r.db.SelectContext(ctx, &contacts, `
		SELECT *
		FROM legacy_customer_contacts
		WHERE tenant_id = $1
		ORDER BY updated_at DESC, created_at DESC`, tenantID)
	if err == nil {
		r.cacheSet(ctx, fmt.Sprintf("customer:legacy:%s", tenantID.String()), contacts, 10*time.Minute)
	}
	return contacts, err
}

func (r *Repository) ListLegacyBroadcastTargets(ctx context.Context, tenantID uuid.UUID) ([]BroadcastTarget, error) {
	var targets []BroadcastTarget
	cacheKey := fmt.Sprintf("customer:broadcast:%s:legacy", tenantID.String())
	if r.cacheGet(ctx, cacheKey, &targets) {
		return targets, nil
	}
	err := r.db.SelectContext(ctx, &targets, `
		SELECT id, name, phone
		FROM legacy_customer_contacts
		WHERE tenant_id = $1 AND COALESCE(phone, '') <> ''
		ORDER BY updated_at DESC, created_at DESC`, tenantID)
	if err == nil {
		r.cacheSet(ctx, cacheKey, targets, 10*time.Minute)
	}
	return targets, err
}

func (r *Repository) MarkLegacyBlastSent(ctx context.Context, tenantID uuid.UUID, phone string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE legacy_customer_contacts
		SET last_blast_at = NOW(),
			blast_count = blast_count + 1,
			updated_at = NOW()
		WHERE tenant_id = $1 AND phone = $2`, tenantID, phone)
	if err == nil {
		r.InvalidateTenantCache(ctx, tenantID)
	}
	return err
}

func (r *Repository) MarkPhoneVerified(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE customers
		SET
			account_status = 'verified',
			account_stage = CASE
				WHEN account_stage = 'suspended' THEN account_stage
				ELSE 'active'
			END,
			phone_verified_at = COALESCE(phone_verified_at, NOW()),
			profile_completed_at = CASE
				WHEN profile_completed_at IS NULL AND COALESCE(BTRIM(name), '') <> '' THEN NOW()
				ELSE profile_completed_at
			END,
			updated_at = NOW()
		WHERE id = $1
	`, id)
	if err != nil {
		return wrapCustomerRepoErr("repo: gagal update verifikasi customer", err)
	}
	r.InvalidateCustomerMembershipCache(ctx, id)
	return nil
}

func (r *Repository) CountByTenant(ctx context.Context, tenantID uuid.UUID) (int, error) {
	var total int
	err := r.db.GetContext(ctx, &total, `
		SELECT COUNT(DISTINCT c.id)
		FROM customers c
		JOIN bookings b ON b.customer_id = c.id
		WHERE b.tenant_id = $1`, tenantID)
	return total, err
}

func (r *Repository) GetTenantBillingState(ctx context.Context, tenantID uuid.UUID) (string, string, *time.Time, *time.Time, error) {
	type row struct {
		Plan   string     `db:"plan"`
		Status string     `db:"subscription_status"`
		Start  *time.Time `db:"subscription_current_period_start"`
		End    *time.Time `db:"subscription_current_period_end"`
	}

	var rrow row
	if err := r.db.GetContext(ctx, &rrow, `
		SELECT plan, subscription_status, subscription_current_period_start, subscription_current_period_end
		FROM tenants
		WHERE id = $1
		LIMIT 1`, tenantID); err != nil {
		return "", "", nil, nil, err
	}
	return rrow.Plan, rrow.Status, rrow.Start, rrow.End, nil
}

func (r *Repository) GetTenantName(ctx context.Context, tenantID uuid.UUID) (string, error) {
	var name string
	err := r.db.GetContext(ctx, &name, `SELECT name FROM tenants WHERE id = $1 LIMIT 1`, tenantID)
	return name, err
}

func (r *Repository) ListBroadcastTargets(ctx context.Context, tenantID uuid.UUID) ([]BroadcastTarget, error) {
	var targets []BroadcastTarget
	cacheKey := fmt.Sprintf("customer:broadcast:%s:active", tenantID.String())
	if r.cacheGet(ctx, cacheKey, &targets) {
		return targets, nil
	}
	err := r.db.SelectContext(ctx, &targets, `
		SELECT id, name, phone
		FROM customers c
		WHERE COALESCE(c.phone, '') <> ''
		AND EXISTS (
			SELECT 1
			FROM bookings b
			WHERE b.customer_id = c.id
			AND b.tenant_id = $1
		)
		ORDER BY c.updated_at DESC, c.created_at DESC`, tenantID)
	if err == nil {
		r.cacheSet(ctx, cacheKey, targets, 10*time.Minute)
	}
	return targets, err
}

func (r *Repository) CreateAuditLog(ctx context.Context, tenantID uuid.UUID, actorUserID *uuid.UUID, action, resourceType string, resourceID *uuid.UUID, metadata map[string]any) error {
	rawMetadata, _ := json.Marshal(metadata)
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO tenant_audit_logs (
			id, tenant_id, actor_user_id, action, resource_type, resource_id, metadata, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, NOW()
		)`,
		uuid.New(), tenantID, actorUserID, action, resourceType, resourceID, rawMetadata,
	)
	return err
}

// FindByPhone digunakan untuk validasi awal sebelum booking & login OTP.
func (r *Repository) FindByPhone(ctx context.Context, phone string) (*Customer, error) {
	var c Customer
	query := `SELECT * FROM customers WHERE phone = $1 LIMIT 1`
	err := r.db.GetContext(ctx, &c, query, phone)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, wrapCustomerRepoErr("repo: gagal cari customer by phone", err)
	}
	return &c, nil
}

func (r *Repository) FindByEmail(ctx context.Context, email string) (*Customer, error) {
	var c Customer
	query := `SELECT * FROM customers WHERE LOWER(email) = LOWER($1) LIMIT 1`
	err := r.db.GetContext(ctx, &c, query, strings.TrimSpace(email))
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, wrapCustomerRepoErr("repo: gagal cari customer by email", err)
	}
	return &c, nil
}

func (r *Repository) FindByGoogleSubject(ctx context.Context, subject string) (*Customer, error) {
	var c Customer
	query := `SELECT * FROM customers WHERE google_subject = $1 LIMIT 1`
	err := r.db.GetContext(ctx, &c, query, strings.TrimSpace(subject))
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, wrapCustomerRepoErr("repo: gagal cari customer by google subject", err)
	}
	return &c, nil
}

func (r *Repository) UpdateProfile(ctx context.Context, id uuid.UUID, req UpdateProfileReq) (*Customer, error) {
	setClauses := []string{"updated_at = NOW()"}
	args := []any{}
	argIdx := 1

	if req.Name != nil && strings.TrimSpace(*req.Name) != "" {
		setClauses = append(setClauses, fmt.Sprintf("name = $%d", argIdx))
		args = append(args, strings.TrimSpace(*req.Name))
		argIdx++
	}
	if req.Email != nil {
		setClauses = append(setClauses, fmt.Sprintf("email = $%d", argIdx))
		args = append(args, strings.TrimSpace(*req.Email))
		argIdx++
	}
	if req.AvatarURL != nil {
		avatarURL := strings.TrimSpace(*req.AvatarURL)
		if avatarURL == "" {
			setClauses = append(setClauses, fmt.Sprintf("avatar_url = NULL"))
		} else {
			setClauses = append(setClauses, fmt.Sprintf("avatar_url = $%d", argIdx))
			args = append(args, avatarURL)
			argIdx++
		}
	}
	if req.BirthDate != nil {
		setClauses = append(setClauses, fmt.Sprintf("birth_date = $%d", argIdx))
		args = append(args, *req.BirthDate)
		argIdx++
	}
	if req.Gender != nil {
		setClauses = append(setClauses, fmt.Sprintf("gender = $%d", argIdx))
		args = append(args, strings.TrimSpace(*req.Gender))
		argIdx++
	}
	if req.City != nil {
		setClauses = append(setClauses, fmt.Sprintf("city = $%d", argIdx))
		args = append(args, strings.TrimSpace(*req.City))
		argIdx++
	}
	if req.Province != nil {
		setClauses = append(setClauses, fmt.Sprintf("province = $%d", argIdx))
		args = append(args, strings.TrimSpace(*req.Province))
		argIdx++
	}
	if req.CountryCode != nil {
		setClauses = append(setClauses, fmt.Sprintf("country_code = $%d", argIdx))
		args = append(args, strings.ToUpper(strings.TrimSpace(*req.CountryCode)))
		argIdx++
	}
	if req.MarketingOptIn != nil {
		setClauses = append(setClauses, fmt.Sprintf("marketing_opt_in = $%d", argIdx))
		args = append(args, *req.MarketingOptIn)
		argIdx++
	}

	if len(args) == 0 && len(setClauses) == 1 {
		return r.FindByID(ctx, id)
	}

	setClauses = append(setClauses, `profile_completed_at = CASE
		WHEN profile_completed_at IS NULL AND COALESCE(BTRIM(name), '') <> '' THEN NOW()
		ELSE profile_completed_at
	END`)

	query := fmt.Sprintf(`
		UPDATE customers
		SET %s
		WHERE id = $%d
		RETURNING *`,
		strings.Join(setClauses, ", "),
		argIdx,
	)
	args = append(args, id)

	var c Customer
	if err := r.db.GetContext(ctx, &c, query, args...); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, wrapCustomerRepoErr("repo: gagal update customer", err)
	}
	r.InvalidateCustomerMembershipCache(ctx, id)
	return &c, nil
}

func (r *Repository) UpdatePasswordHash(ctx context.Context, id uuid.UUID, hashedPassword string) (*Customer, error) {
	var c Customer
	if err := r.db.GetContext(ctx, &c, `
		UPDATE customers
		SET password = $1,
			account_stage = CASE
				WHEN account_stage = 'suspended' THEN account_stage
				ELSE 'active'
			END,
			profile_completed_at = COALESCE(profile_completed_at, NOW()),
			updated_at = NOW()
		WHERE id = $2
		RETURNING *`, hashedPassword, id); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, wrapCustomerRepoErr("repo: gagal update password customer", err)
	}
	r.InvalidateCustomerMembershipCache(ctx, id)
	return &c, nil
}

func (r *Repository) UpdatePhone(ctx context.Context, id uuid.UUID, phone string) (*Customer, error) {
	var c Customer
	if err := r.db.GetContext(ctx, &c, `
		UPDATE customers
		SET phone = $1,
			account_status = 'verified',
			account_stage = CASE
				WHEN account_stage = 'suspended' THEN account_stage
				ELSE 'active'
			END,
			phone_verified_at = NOW(),
			profile_completed_at = COALESCE(profile_completed_at, NOW()),
			updated_at = NOW()
		WHERE id = $2
		RETURNING *`, phone, id); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, wrapCustomerRepoErr("repo: gagal update nomor WhatsApp customer", err)
	}
	r.InvalidateCustomerMembershipCache(ctx, id)
	return &c, nil
}

func (r *Repository) LinkGoogleIdentity(ctx context.Context, id uuid.UUID, subject string, email, name, avatarURL *string) (*Customer, error) {
	var c Customer
	if err := r.db.GetContext(ctx, &c, `
		UPDATE customers
		SET google_subject = $1,
			email = COALESCE($2, email),
			name = CASE
				WHEN COALESCE(BTRIM(name), '') = '' AND COALESCE(BTRIM($3), '') <> '' THEN $3
				ELSE name
			END,
			avatar_url = CASE
				WHEN COALESCE(BTRIM(avatar_url), '') = '' AND COALESCE(BTRIM($4), '') <> '' THEN $4
				ELSE avatar_url
			END,
			account_stage = CASE
				WHEN account_stage = 'suspended' THEN account_stage
				ELSE 'active'
			END,
			registration_source = CASE
				WHEN COALESCE(BTRIM(registration_source), '') = '' THEN 'google'
				WHEN registration_source = 'booking' THEN 'google'
				ELSE registration_source
			END,
			profile_completed_at = COALESCE(profile_completed_at, NOW()),
			updated_at = NOW()
		WHERE id = $5
		RETURNING *`,
		strings.TrimSpace(subject),
		email,
		name,
		avatarURL,
		id,
	); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, wrapCustomerRepoErr("repo: gagal link google identity", err)
	}
	r.InvalidateCustomerMembershipCache(ctx, id)
	return &c, nil
}

func (r *Repository) TouchLogin(ctx context.Context, id uuid.UUID, method string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE customers
		SET last_login_method = $2,
			last_login_at = NOW(),
			account_stage = CASE
				WHEN account_stage = 'suspended' THEN account_stage
				ELSE 'active'
			END,
			updated_at = NOW()
		WHERE id = $1`,
		id, strings.TrimSpace(method),
	)
	if err == nil {
		r.InvalidateCustomerMembershipCache(ctx, id)
	}
	return err
}

// --- FUNGSI LAINNYA ---

func (r *Repository) IncrementStats(ctx context.Context, id uuid.UUID, amount int64) error {
	query := `
		UPDATE customers SET 
			total_visits = total_visits + 1,
			total_spent = total_spent + $2,
			last_visit = NOW(),
			updated_at = NOW(),
			tier = CASE 
				WHEN (total_visits + 1) >= 50 THEN 'VIP'
				WHEN (total_visits + 1) >= 15 THEN 'GOLD'
				ELSE 'REGULAR'
			END
		WHERE id = $1`

	_, err := r.db.ExecContext(ctx, query, id, amount)
	if err == nil {
		r.InvalidateCustomerMembershipCache(ctx, id)
	}
	return err
}

func (r *Repository) AwardBookingPoints(ctx context.Context, customerID, tenantID, bookingID uuid.UUID, paidAmount int64, points int, description string) (int, error) {
	if points <= 0 {
		return 0, nil
	}

	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer func() { _ = tx.Rollback() }()

	var insertedID uuid.UUID
	err = tx.GetContext(ctx, &insertedID, `
		INSERT INTO customer_point_ledger (
			id, customer_id, tenant_id, booking_id, event_type, points, description, metadata, created_at
		) VALUES (
			$1, $2, $3, $4, 'earn', $5, $6, jsonb_build_object('paid_amount', $7::bigint), NOW()
		)
		ON CONFLICT DO NOTHING
		RETURNING id`,
		uuid.New(), customerID, tenantID, bookingID, points, description, paidAmount,
	)
	if err == sql.ErrNoRows {
		return 0, tx.Commit()
	}
	if err != nil {
		var existing int
		getErr := tx.GetContext(ctx, &existing, `
			SELECT points
			FROM customer_point_ledger
			WHERE booking_id = $1 AND event_type = 'earn'
			LIMIT 1`, bookingID)
		if getErr == nil {
			return 0, tx.Commit()
		}
		return 0, err
	}

	if _, err := tx.ExecContext(ctx, `
		UPDATE customers
		SET loyalty_points = loyalty_points + $2,
			updated_at = NOW()
		WHERE id = $1`,
		customerID, points,
	); err != nil {
		return 0, err
	}

	if err := tx.Commit(); err != nil {
		return 0, err
	}
	r.InvalidateTenantCache(ctx, tenantID)
	return points, nil
}

func (r *Repository) ListPointActivity(ctx context.Context, customerID uuid.UUID, tenantID *uuid.UUID, limit int) ([]CustomerPointEvent, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	args := []any{customerID, limit}
	filter := ""
	if tenantID != nil {
		args = []any{customerID, *tenantID, limit}
		filter = "AND l.tenant_id = $2"
	}

	limitArg := "$2"
	if tenantID != nil {
		limitArg = "$3"
	}

	var events []CustomerPointEvent
	err := r.db.SelectContext(ctx, &events, fmt.Sprintf(`
		SELECT
			l.id, l.customer_id, l.tenant_id, t.name AS tenant_name, t.slug AS tenant_slug,
			l.booking_id, l.event_type, l.points, l.description, l.created_at
		FROM customer_point_ledger l
		LEFT JOIN tenants t ON t.id = l.tenant_id
		WHERE l.customer_id = $1 %s
		ORDER BY l.created_at DESC
		LIMIT %s`, filter, limitArg), args...)
	return events, err
}

func (r *Repository) SumEarnedPointsAtTenant(ctx context.Context, customerID, tenantID uuid.UUID) (int, error) {
	var total int
	err := r.db.GetContext(ctx, &total, `
		SELECT COALESCE(SUM(points), 0)
		FROM customer_point_ledger
		WHERE customer_id = $1 AND tenant_id = $2 AND event_type = 'earn'`,
		customerID, tenantID,
	)
	return total, err
}

func (r *Repository) FindByTenant(ctx context.Context, tenantID uuid.UUID) ([]Customer, error) {
	var customers []Customer
	cacheKey := fmt.Sprintf("customer:tenant:%s", tenantID.String())
	if r.cacheGet(ctx, cacheKey, &customers) {
		return customers, nil
	}
	query := `
		SELECT
			c.*,
			COALESCE(stats.total_visits, 0) AS total_visits,
			COALESCE(stats.total_spent, 0) AS total_spent,
			stats.last_visit AS last_visit
		FROM customers c
		JOIN LATERAL (
			SELECT
				COUNT(*) FILTER (WHERE b.status IN ('confirmed', 'pending', 'active', 'ongoing', 'completed')) AS total_visits,
				COALESCE(SUM(CASE WHEN b.payment_status IN ('settled', 'partial_paid', 'paid') THEN b.grand_total ELSE 0 END), 0) AS total_spent,
				MAX(b.end_time) FILTER (WHERE b.status IN ('completed', 'active', 'ongoing', 'confirmed', 'pending')) AS last_visit
			FROM bookings b
			WHERE b.customer_id = c.id AND b.tenant_id = $1
		) stats ON TRUE
		WHERE EXISTS (
			SELECT 1 FROM bookings b WHERE b.customer_id = c.id AND b.tenant_id = $1
		)
		ORDER BY COALESCE(stats.total_spent, 0) DESC, c.updated_at DESC`
	err := r.db.SelectContext(ctx, &customers, query, tenantID)
	if err == nil {
		r.cacheSet(ctx, cacheKey, customers, 5*time.Minute)
	}
	return customers, err
}

func (r *Repository) FindByID(ctx context.Context, id uuid.UUID) (*Customer, error) {
	var c Customer
	query := `
		SELECT
			c.*,
			COALESCE(stats.total_visits, 0) AS total_visits,
			COALESCE(stats.total_spent, 0) AS total_spent,
			stats.last_visit AS last_visit
		FROM customers c
		LEFT JOIN LATERAL (
			SELECT
				COUNT(*) FILTER (WHERE b.status IN ('confirmed', 'pending', 'active', 'ongoing', 'completed')) AS total_visits,
				COALESCE(SUM(CASE WHEN b.payment_status IN ('settled', 'partial_paid', 'paid') THEN b.grand_total ELSE 0 END), 0) AS total_spent,
				MAX(b.end_time) FILTER (WHERE b.status IN ('completed', 'active', 'ongoing', 'confirmed', 'pending')) AS last_visit
			FROM bookings b
			WHERE b.customer_id = c.id
		) stats ON TRUE
		WHERE c.id = $1
		LIMIT 1`
	err := r.db.GetContext(ctx, &c, query, id)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, wrapCustomerRepoErr("repo: gagal cari customer by id", err)
	}
	return &c, nil
}

func (r *Repository) FindByIDForTenant(ctx context.Context, id, tenantID uuid.UUID) (*Customer, error) {
	var c Customer
	query := `
		SELECT
			c.*,
			COALESCE(stats.total_visits, 0) AS total_visits,
			COALESCE(stats.total_spent, 0) AS total_spent,
			stats.last_visit AS last_visit
		FROM customers c
		JOIN LATERAL (
			SELECT
				COUNT(*) FILTER (WHERE b.status IN ('confirmed', 'pending', 'active', 'ongoing', 'completed')) AS total_visits,
				COALESCE(SUM(CASE WHEN b.payment_status IN ('settled', 'partial_paid', 'paid') THEN b.grand_total ELSE 0 END), 0) AS total_spent,
				MAX(b.end_time) FILTER (WHERE b.status IN ('completed', 'active', 'ongoing', 'confirmed', 'pending')) AS last_visit
			FROM bookings b
			WHERE b.customer_id = c.id AND b.tenant_id = $2
		) stats ON TRUE
		WHERE c.id = $1
		LIMIT 1`
	err := r.db.GetContext(ctx, &c, query, id, tenantID)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, wrapCustomerRepoErr("repo: gagal cari customer by id tenant", err)
	}
	return &c, nil
}

func (r *Repository) GetActiveBookings(ctx context.Context, customerID uuid.UUID, limit int) ([]RecentHistoryDTO, error) {
	var bookings []RecentHistoryDTO
	query := `
		SELECT 
			'booking' as kind, b.id, b.tenant_id, t.name as tenant_name, t.slug as tenant_slug,
			res.name as resource, b.start_time as date, b.end_time as end_date,
			b.grand_total, b.deposit_amount, b.paid_amount, b.balance_due,
			b.status, b.payment_status, b.payment_method,
			COALESCE((SELECT SUM(price_at_booking) FROM booking_options WHERE booking_id = b.id), 0) +
			COALESCE((SELECT SUM(price_at_purchase * quantity) FROM order_items WHERE booking_id = b.id), 0) as total_spent
		FROM bookings b
		JOIN resources res ON b.resource_id = res.id
		JOIN tenants t ON t.id = b.tenant_id
		WHERE b.customer_id = $1
			AND (
				b.status IN ('confirmed', 'pending', 'active', 'ongoing')
				OR (
					b.status = 'completed'
					AND (
						COALESCE(b.balance_due, 0) > 0
						OR COALESCE(b.payment_status, '') IN ('pending', 'partial_paid', 'unpaid', 'failed', 'expired')
					)
				)
			)
		ORDER BY b.start_time ASC`
	args := []any{customerID}
	if limit > 0 {
		query += ` LIMIT $2`
		args = append(args, limit)
	}
	err := r.db.SelectContext(ctx, &bookings, query, args...)
	return bookings, err
}

func (r *Repository) GetPastHistory(ctx context.Context, customerID uuid.UUID, limit int) ([]RecentHistoryDTO, error) {
	var history []RecentHistoryDTO
	query := `
		SELECT 
			'booking' as kind, b.id, b.tenant_id, t.name as tenant_name, t.slug as tenant_slug,
			res.name as resource, b.start_time as date, b.end_time as end_date,
			b.grand_total, b.deposit_amount, b.paid_amount, b.balance_due,
			b.status, b.payment_status, b.payment_method,
			COALESCE((SELECT SUM(price_at_booking) FROM booking_options WHERE booking_id = b.id), 0) +
			COALESCE((SELECT SUM(price_at_purchase * quantity) FROM order_items WHERE booking_id = b.id), 0) as total_spent
		FROM bookings b
		JOIN resources res ON b.resource_id = res.id
		JOIN tenants t ON t.id = b.tenant_id
		WHERE b.customer_id = $1
			AND (
				b.status = 'cancelled'
				OR (
					b.status = 'completed'
					AND (
						COALESCE(b.balance_due, 0) <= 0
						OR COALESCE(b.payment_status, '') IN ('settled', 'paid')
					)
				)
			)
		ORDER BY b.start_time DESC LIMIT $2`
	err := r.db.SelectContext(ctx, &history, query, customerID, limit)
	return history, err
}

func (r *Repository) GetTransactionHistory(ctx context.Context, customerID uuid.UUID, limit int) ([]RecentHistoryDTO, error) {
	var history []RecentHistoryDTO
	query := `
		SELECT 
			'booking' as kind, b.id, b.tenant_id, t.name as tenant_name, t.slug as tenant_slug,
			res.name as resource, b.start_time as date, b.end_time as end_date,
			b.grand_total, b.deposit_amount, b.paid_amount, b.balance_due,
			b.status, b.payment_status, b.payment_method,
			COALESCE((SELECT SUM(price_at_booking) FROM booking_options WHERE booking_id = b.id), 0) +
			COALESCE((SELECT SUM(price_at_purchase * quantity) FROM order_items WHERE booking_id = b.id), 0) as total_spent
		FROM bookings b
		JOIN resources res ON b.resource_id = res.id
		JOIN tenants t ON t.id = b.tenant_id
		WHERE b.customer_id = $1
		ORDER BY b.start_time DESC
		LIMIT $2`
	err := r.db.SelectContext(ctx, &history, query, customerID, limit)
	return history, err
}

func (r *Repository) GetActiveOrders(ctx context.Context, customerID uuid.UUID, limit int) ([]RecentHistoryDTO, error) {
	var orders []RecentHistoryDTO
	query := `
		SELECT
			'order' as kind, so.id, so.tenant_id, t.name as tenant_name, t.slug as tenant_slug,
			res.name as resource, so.created_at as date, so.completed_at as end_date,
			COALESCE(so.grand_total, 0)::bigint as grand_total,
			0::bigint as deposit_amount,
			COALESCE(so.grand_total, 0)::bigint as total_spent,
			COALESCE(so.paid_amount, 0)::bigint as paid_amount,
			COALESCE(so.balance_due, 0)::bigint as balance_due,
			so.status, so.payment_status, so.payment_method
		FROM sales_orders so
		JOIN resources res ON so.resource_id = res.id
		JOIN tenants t ON t.id = so.tenant_id
		WHERE so.customer_id = $1
		  AND (
			COALESCE(so.status, '') IN ('open', 'pending_payment', 'paid')
			OR (
				COALESCE(so.status, '') = 'completed'
				AND (
					COALESCE(so.balance_due, 0) > 0
					OR COALESCE(so.payment_status, '') IN ('pending', 'partial_paid', 'unpaid', 'failed', 'expired', 'awaiting_verification')
				)
			)
		  )
		ORDER BY so.created_at DESC`
	args := []any{customerID}
	if limit > 0 {
		query += ` LIMIT $2`
		args = append(args, limit)
	}
	err := r.db.SelectContext(ctx, &orders, query, args...)
	return orders, err
}

func (r *Repository) GetPastOrders(ctx context.Context, customerID uuid.UUID, limit int) ([]RecentHistoryDTO, error) {
	var orders []RecentHistoryDTO
	query := `
		SELECT
			'order' as kind, so.id, so.tenant_id, t.name as tenant_name, t.slug as tenant_slug,
			res.name as resource, so.created_at as date, so.completed_at as end_date,
			COALESCE(so.grand_total, 0)::bigint as grand_total,
			0::bigint as deposit_amount,
			COALESCE(so.grand_total, 0)::bigint as total_spent,
			COALESCE(so.paid_amount, 0)::bigint as paid_amount,
			COALESCE(so.balance_due, 0)::bigint as balance_due,
			so.status, so.payment_status, so.payment_method
		FROM sales_orders so
		JOIN resources res ON so.resource_id = res.id
		JOIN tenants t ON t.id = so.tenant_id
		WHERE so.customer_id = $1
		  AND (
			COALESCE(so.status, '') = 'cancelled'
			OR (
				COALESCE(so.status, '') = 'completed'
				AND (
					COALESCE(so.balance_due, 0) <= 0
					OR COALESCE(so.payment_status, '') IN ('settled', 'paid')
				)
			)
		  )
		ORDER BY so.created_at DESC
		LIMIT $2`
	err := r.db.SelectContext(ctx, &orders, query, customerID, limit)
	return orders, err
}

func wrapCustomerRepoErr(prefix string, err error) error {
	var pqErr *pq.Error
	if errors.As(err, &pqErr) && pqErr.Code == "42P01" {
		return fmt.Errorf("%s: tabel customers belum tersedia; jalankan migrasi database terlebih dahulu: %w", prefix, err)
	}
	return fmt.Errorf("%s: %w", prefix, err)
}
