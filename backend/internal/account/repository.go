package account

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

func (r *Repository) CreateAccount(ctx context.Context, item Account) (*Account, error) {
	var created Account
	err := r.db.GetContext(ctx, &created, `
		INSERT INTO accounts (id, name, email, password_hash, google_subject, email_verified_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, name, email, password_hash, google_subject, email_verified_at, created_at, updated_at
	`, item.ID, item.Name, item.Email, item.PasswordHash, item.GoogleSubject, item.EmailVerifiedAt)
	if err != nil {
		return nil, err
	}
	return &created, nil
}

func (r *Repository) GetAccountByEmail(ctx context.Context, email string) (*Account, error) {
	var item Account
	err := r.db.GetContext(ctx, &item, `
		SELECT id, name, email, password_hash, google_subject, email_verified_at, created_at, updated_at
		FROM accounts
		WHERE email = $1
	`, email)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *Repository) GetAccountByGoogleSubject(ctx context.Context, subject string) (*Account, error) {
	var item Account
	err := r.db.GetContext(ctx, &item, `
		SELECT id, name, email, password_hash, google_subject, email_verified_at, created_at, updated_at
		FROM accounts
		WHERE google_subject = $1
	`, subject)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *Repository) GetAccountByID(ctx context.Context, id uuid.UUID) (*Account, error) {
	var item Account
	err := r.db.GetContext(ctx, &item, `
		SELECT id, name, email, password_hash, google_subject, email_verified_at, created_at, updated_at
		FROM accounts
		WHERE id = $1
	`, id)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *Repository) LinkGoogleAccount(ctx context.Context, accountID uuid.UUID, subject, name, email string, verifiedAt *time.Time) (*Account, error) {
	var item Account
	err := r.db.GetContext(ctx, &item, `
		UPDATE accounts
		SET
			google_subject = $2,
			name = CASE WHEN BTRIM($3) <> '' THEN $3 ELSE name END,
			email = CASE WHEN BTRIM($4) <> '' THEN LOWER(BTRIM($4)) ELSE email END,
			email_verified_at = CASE WHEN $5::timestamptz IS NOT NULL THEN $5 ELSE email_verified_at END,
			updated_at = NOW()
		WHERE id = $1
		RETURNING id, name, email, password_hash, google_subject, email_verified_at, created_at, updated_at
	`, accountID, subject, name, email, verifiedAt)
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *Repository) GetTenantIDByReferralCode(ctx context.Context, code string) (*uuid.UUID, error) {
	var id uuid.UUID
	err := r.db.GetContext(ctx, &id, `
		SELECT id
		FROM tenants
		WHERE LOWER(TRIM(referral_code)) = $1
		LIMIT 1
	`, strings.ToLower(strings.TrimSpace(code)))
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &id, nil
}

func (r *Repository) CreateWorkspaceWithOwner(ctx context.Context, workspace Workspace, accountID uuid.UUID) (*Workspace, *WorkspaceMembership, *OnboardingState, error) {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, nil, nil, err
	}
	defer tx.Rollback()

	var owner Account
	if err := tx.GetContext(ctx, &owner, `
		SELECT id, name, email, password_hash, google_subject, email_verified_at, created_at, updated_at
		FROM accounts
		WHERE id = $1
	`, accountID); err != nil {
		return nil, nil, nil, err
	}

	tenantID := uuid.New()
	ownerUserID := uuid.New()
	referralCode := generateWorkspaceReferralCode(workspace.Slug)
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO tenants (
			id, name, slug, business_category, business_type,
			plan, subscription_status, timezone, whatsapp_number,
			tagline, about_us, primary_color, referral_code, referred_by_tenant_id, created_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
	`, tenantID, workspace.Name, workspace.Slug, workspace.BusinessCategory, workspace.BusinessType,
		workspace.Plan, workspace.SubscriptionStatus, workspace.Timezone, workspace.WhatsappNumber,
		"Booking simpel untuk bisnis yang bergerak cepat.", "Kelola reservasi, resource, customer, dan pembayaran dari satu workspace.", "#2563eb", referralCode, workspace.ReferredByTenantID); err != nil {
		return nil, nil, nil, err
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO users (
			id, tenant_id, name, email, password, email_verified_at,
			password_setup_required, role, created_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, FALSE, 'owner', NOW())
	`, ownerUserID, tenantID, owner.Name, owner.Email, owner.PasswordHash, owner.EmailVerifiedAt); err != nil {
		return nil, nil, nil, err
	}

	var createdWorkspace Workspace
	if err := tx.GetContext(ctx, &createdWorkspace, `
		INSERT INTO workspaces (id, tenant_id, owner_user_id, name, slug, business_category, business_type, status, plan, subscription_status, timezone, whatsapp_number)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id, tenant_id, owner_user_id, name, slug, business_category, business_type, status, plan, subscription_status, timezone, whatsapp_number, created_at, updated_at
	`, workspace.ID, tenantID, ownerUserID, workspace.Name, workspace.Slug, workspace.BusinessCategory, workspace.BusinessType, workspace.Status, workspace.Plan, workspace.SubscriptionStatus, workspace.Timezone, workspace.WhatsappNumber); err != nil {
		return nil, nil, nil, err
	}

	membership := WorkspaceMembership{
		ID:             uuid.New(),
		AccountID:      accountID,
		WorkspaceID:    createdWorkspace.ID,
		AdminUserID:    ownerUserID,
		Role:           "owner",
		PermissionKeys: pq.StringArray{},
		Status:         "active",
	}
	var createdMembership WorkspaceMembership
	if err := tx.GetContext(ctx, &createdMembership, `
		INSERT INTO workspace_memberships (id, account_id, workspace_id, admin_user_id, role, permission_keys, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, account_id, workspace_id, admin_user_id, role, permission_keys, status, created_at, updated_at
	`, membership.ID, membership.AccountID, membership.WorkspaceID, membership.AdminUserID, membership.Role, membership.PermissionKeys, membership.Status); err != nil {
		return nil, nil, nil, err
	}

	state := OnboardingState{
		WorkspaceID:       createdWorkspace.ID,
		CurrentStep:       "template",
		CompletedSteps:    pq.StringArray{"workspace"},
		SelectedStartMode: "",
		IsCompleted:       false,
	}
	var createdState OnboardingState
	if err := tx.GetContext(ctx, &createdState, `
		INSERT INTO workspace_onboarding_states (workspace_id, current_step, completed_steps, selected_start_mode, is_completed)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING workspace_id, current_step, completed_steps, selected_start_mode, is_completed, started_at, completed_at, updated_at
	`, state.WorkspaceID, state.CurrentStep, state.CompletedSteps, state.SelectedStartMode, state.IsCompleted); err != nil {
		return nil, nil, nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, nil, nil, err
	}
	r.invalidateWorkspacePublicCache(ctx, tenantID, workspace.Slug)
	return &createdWorkspace, &createdMembership, &createdState, nil
}

func (r *Repository) ListWorkspacesByAccountID(ctx context.Context, accountID uuid.UUID) ([]WorkspaceListItem, error) {
	var rows []WorkspaceListItem
	err := r.db.SelectContext(ctx, &rows, `
		SELECT
			w.id, w.tenant_id, w.owner_user_id, w.name, w.slug, w.business_category, w.business_type, w.status, w.plan,
			w.subscription_status, w.timezone, w.whatsapp_number, w.created_at, w.updated_at,
			wm.role
		FROM workspace_memberships wm
		JOIN workspaces w ON w.id = wm.workspace_id
		WHERE wm.account_id = $1
		  AND wm.status = 'active'
		ORDER BY wm.created_at ASC
	`, accountID)
	if err != nil {
		return nil, err
	}

	for i := range rows {
		state, err := r.GetOnboardingState(ctx, rows[i].ID)
		if err != nil {
			return nil, err
		}
		rows[i].OnboardingState = state
	}

	return rows, nil
}

func (r *Repository) GetOnboardingState(ctx context.Context, workspaceID uuid.UUID) (*OnboardingState, error) {
	var item OnboardingState
	err := r.db.GetContext(ctx, &item, `
		SELECT workspace_id, current_step, completed_steps, selected_start_mode, is_completed, started_at, completed_at, updated_at
		FROM workspace_onboarding_states
		WHERE workspace_id = $1
	`, workspaceID)
	if err == sql.ErrNoRows {
		return r.ensureOnboardingState(ctx, workspaceID)
	}
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *Repository) GetOnboardingSeed(ctx context.Context, workspaceID uuid.UUID) (*OnboardingSeed, error) {
	var tenantID uuid.UUID
	if err := r.db.GetContext(ctx, &tenantID, `
		SELECT tenant_id
		FROM workspaces
		WHERE id = $1
	`, workspaceID); err != nil {
		return nil, err
	}

	seed := &OnboardingSeed{
		Resource: OnboardingResourceSeed{
			ResourceCategory: "main",
			PriceUnit:        "hour",
			UnitDuration:     60,
		},
		Business: OnboardingBusinessSeed{
			OpenTime:  "09:00",
			CloseTime: "22:00",
		},
	}

	var resourceRow struct {
		ResourceName     string `db:"resource_name"`
		ResourceCategory string `db:"resource_category"`
		ResourceDesc     string `db:"resource_description"`
		ResourceImageURL string `db:"resource_image_url"`
		PriceName        string `db:"price_name"`
		Price            int64  `db:"price"`
		PriceUnit        string `db:"price_unit"`
		UnitDuration     int    `db:"unit_duration"`
	}
	resourceErr := r.db.GetContext(ctx, &resourceRow, `
		SELECT
			COALESCE(r.name, '') AS resource_name,
			COALESCE(r.category, 'main') AS resource_category,
			COALESCE(r.description, '') AS resource_description,
			COALESCE(r.image_url, '') AS resource_image_url,
			COALESCE(ri.name, '') AS price_name,
			COALESCE(ri.price, 0) AS price,
			COALESCE(ri.price_unit, 'hour') AS price_unit,
			COALESCE(ri.unit_duration, 60) AS unit_duration
		FROM resources r
		LEFT JOIN resource_items ri
			ON ri.resource_id = r.id
			AND ri.item_type = 'main_option'
			AND ri.is_default = TRUE
		WHERE r.tenant_id = $1
		  AND r.metadata->>'onboarding_seed' = 'true'
		  AND r.status <> 'deleted'
		ORDER BY r.created_at DESC
		LIMIT 1
	`, tenantID)
	if resourceErr == nil {
		seed.Resource = OnboardingResourceSeed(resourceRow)
	}

	if err := r.db.GetContext(ctx, &seed.Business, `
		SELECT
			COALESCE(open_time, '09:00') AS open_time,
			COALESCE(close_time, '22:00') AS close_time,
			COALESCE(whatsapp_number, '') AS whatsapp_number
		FROM tenants
		WHERE id = $1
	`, tenantID); err != nil {
		return nil, err
	}

	type paymentRow struct {
		Code     string `db:"code"`
		IsActive bool   `db:"is_active"`
		MetaJSON string `db:"metadata"`
		Instr    string `db:"instructions"`
	}
	var rows []paymentRow
	if err := r.db.SelectContext(ctx, &rows, `
		SELECT code, is_active, COALESCE(metadata::text, '{}') AS metadata, COALESCE(instructions, '') AS instructions
		FROM tenant_payment_methods
		WHERE tenant_id = $1
	`, tenantID); err != nil {
		return nil, err
	}

	for _, row := range rows {
		meta := map[string]any{}
		_ = json.Unmarshal([]byte(row.MetaJSON), &meta)
		switch row.Code {
		case "bank_transfer":
			seed.PaymentMethods.BankTransferEnabled = row.IsActive
			seed.PaymentMethods.BankName = strings.TrimSpace(anyToString(meta["bank_name"]))
			seed.PaymentMethods.BankAccountName = strings.TrimSpace(anyToString(meta["account_name"]))
			seed.PaymentMethods.BankAccountNumber = strings.TrimSpace(anyToString(meta["account_number"]))
			seed.PaymentMethods.BankInstructions = strings.TrimSpace(row.Instr)
		case "qris_static":
			seed.PaymentMethods.QRISStaticEnabled = row.IsActive
			seed.PaymentMethods.QRISImageURL = strings.TrimSpace(anyToString(meta["qr_image_url"]))
			seed.PaymentMethods.QRISInstructions = strings.TrimSpace(row.Instr)
		}
	}

	return seed, nil
}

func (r *Repository) AccountCanAccessWorkspace(ctx context.Context, accountID, workspaceID uuid.UUID) (bool, error) {
	var exists bool
	err := r.db.GetContext(ctx, &exists, `
		SELECT EXISTS (
			SELECT 1
			FROM workspace_memberships
			WHERE account_id = $1
			  AND workspace_id = $2
			  AND status = 'active'
		)
	`, accountID, workspaceID)
	return exists, err
}

func (r *Repository) CreateOnboardingResource(ctx context.Context, workspaceID uuid.UUID, name, category, description, imageURL, priceName string, price int64, priceUnit string, unitDuration int) error {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil
	}
	category = strings.TrimSpace(category)
	if category == "" {
		category = "main"
	}
	priceName = strings.TrimSpace(priceName)
	if priceName == "" {
		priceName = "Standard"
	}
	priceUnit = strings.TrimSpace(priceUnit)
	if priceUnit == "" {
		priceUnit = "hour"
	}
	if unitDuration <= 0 {
		unitDuration = 60
	}

	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var tenantID uuid.UUID
	if err := tx.GetContext(ctx, &tenantID, `
		SELECT tenant_id
		FROM workspaces
		WHERE id = $1
	`, workspaceID); err != nil {
		return err
	}

	meta, _ := json.Marshal(map[string]any{
		"onboarding_seed": true,
		"source":          "account_onboarding",
	})

	itemMeta, _ := json.Marshal(map[string]any{
		"onboarding_seed": true,
		"source":          "account_onboarding",
	})

	var resourceID uuid.UUID
	resourceErr := tx.GetContext(ctx, &resourceID, `
		SELECT id
		FROM resources
		WHERE tenant_id = $1
		  AND metadata->>'onboarding_seed' = 'true'
		  AND status <> 'deleted'
		ORDER BY created_at DESC
		LIMIT 1
	`, tenantID)
	if resourceErr != nil && resourceErr != sql.ErrNoRows {
		return resourceErr
	}

	if resourceErr == sql.ErrNoRows {
		resourceID = uuid.New()
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO resources (
				id, tenant_id, name, category, description,
				operating_mode, image_url, gallery, status, metadata
			)
			VALUES ($1, $2, $3, $4, $5, 'timed', $6, '{}', 'available', $7::jsonb)
		`, resourceID, tenantID, name, category, defaultOnboardingResourceDescription(description), strings.TrimSpace(imageURL), string(meta)); err != nil {
			return err
		}
	} else {
		if _, err := tx.ExecContext(ctx, `
			UPDATE resources
			SET
				name = $2,
				category = $3,
				description = $4,
				image_url = $5,
				metadata = $6::jsonb
			WHERE id = $1
		`, resourceID, name, category, defaultOnboardingResourceDescription(description), strings.TrimSpace(imageURL), string(meta)); err != nil {
			return err
		}
	}

	var itemID uuid.UUID
	itemErr := tx.GetContext(ctx, &itemID, `
		SELECT id
		FROM resource_items
		WHERE resource_id = $1
		  AND item_type = 'main_option'
		  AND is_default = TRUE
		ORDER BY price ASC, id DESC
		LIMIT 1
	`, resourceID)
	if itemErr != nil && itemErr != sql.ErrNoRows {
		return itemErr
	}

	if itemErr == sql.ErrNoRows {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO resource_items (
				id, resource_id, name, price, price_unit,
				unit_duration, item_type, is_default, metadata
			)
			VALUES ($1, $2, $3, $4, $5, $6, 'main_option', TRUE, $7::jsonb)
		`, uuid.New(), resourceID, priceName, price, priceUnit, unitDuration, string(itemMeta)); err != nil {
			return err
		}
	} else {
		if _, err := tx.ExecContext(ctx, `
			UPDATE resource_items
			SET
				name = $2,
				price = $3,
				price_unit = $4,
				unit_duration = $5,
				metadata = $6::jsonb
			WHERE id = $1
		`, itemID, priceName, price, priceUnit, unitDuration, string(itemMeta)); err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}
	r.invalidateWorkspacePublicCache(ctx, tenantID, "")
	return nil
}

func (r *Repository) ensureOnboardingState(ctx context.Context, workspaceID uuid.UUID) (*OnboardingState, error) {
	var item OnboardingState
	err := r.db.GetContext(ctx, &item, `
		INSERT INTO workspace_onboarding_states (
			workspace_id,
			current_step,
			completed_steps,
			selected_start_mode,
			is_completed
		)
		VALUES ($1, 'template', '{}', '', FALSE)
		ON CONFLICT (workspace_id) DO UPDATE
		SET workspace_id = workspace_onboarding_states.workspace_id
		RETURNING workspace_id, current_step, completed_steps, selected_start_mode, is_completed, started_at, completed_at, updated_at
	`, workspaceID)
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *Repository) ConfigureOnboardingPaymentMethods(ctx context.Context, workspaceID uuid.UUID, req PaymentOnboardingReq) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var tenantID uuid.UUID
	if err := tx.GetContext(ctx, &tenantID, `
		SELECT tenant_id
		FROM workspaces
		WHERE id = $1
	`, workspaceID); err != nil {
		return err
	}

	req.BankName = strings.TrimSpace(req.BankName)
	req.BankAccountName = strings.TrimSpace(req.BankAccountName)
	req.BankAccountNumber = strings.TrimSpace(req.BankAccountNumber)
	req.BankInstructions = strings.TrimSpace(req.BankInstructions)
	req.QRISImageURL = strings.TrimSpace(req.QRISImageURL)
	req.QRISInstructions = strings.TrimSpace(req.QRISInstructions)

	bankReady := req.BankName != "" && req.BankAccountName != "" && req.BankAccountNumber != ""
	qrisReady := req.QRISImageURL != ""
	req.BankTransferEnabled = req.BankTransferEnabled && bankReady
	req.QRISStaticEnabled = req.QRISStaticEnabled && qrisReady

	if req.BankInstructions == "" {
		req.BankInstructions = "Transfer ke rekening bisnis, lalu kirim bukti bayar untuk diverifikasi admin."
	}
	if req.QRISInstructions == "" {
		req.QRISInstructions = "Scan QRIS bisnis, lalu kirim bukti bayar untuk diverifikasi admin."
	}

	type paymentMethod struct {
		Code             string
		DisplayName      string
		Category         string
		VerificationType string
		Provider         string
		Instructions     string
		IsActive         bool
		SortOrder        int
		Metadata         map[string]any
	}

	methods := []paymentMethod{
		{
			Code:             "midtrans",
			DisplayName:      "Midtrans / QRIS Gateway",
			Category:         "gateway",
			VerificationType: "auto",
			Provider:         "midtrans",
			Instructions:     "Pembayaran diverifikasi otomatis oleh gateway Midtrans.",
			IsActive:         true,
			SortOrder:        10,
			Metadata:         map[string]any{"source": "account_onboarding"},
		},
		{
			Code:             "cash",
			DisplayName:      "Cash / Bayar di Tempat",
			Category:         "manual",
			VerificationType: "manual",
			Provider:         "cash",
			Instructions:     "Pembayaran diterima langsung oleh admin atau kasir tenant.",
			IsActive:         true,
			SortOrder:        20,
			Metadata:         map[string]any{"source": "account_onboarding"},
		},
		{
			Code:             "bank_transfer",
			DisplayName:      "Transfer Bank",
			Category:         "manual",
			VerificationType: "manual",
			Provider:         "bank_transfer",
			Instructions:     req.BankInstructions,
			IsActive:         req.BankTransferEnabled,
			SortOrder:        30,
			Metadata: map[string]any{
				"source":         "account_onboarding",
				"bank_name":      req.BankName,
				"account_name":   req.BankAccountName,
				"account_number": req.BankAccountNumber,
			},
		},
		{
			Code:             "qris_static",
			DisplayName:      "QRIS Static",
			Category:         "manual",
			VerificationType: "manual",
			Provider:         "qris_static",
			Instructions:     req.QRISInstructions,
			IsActive:         req.QRISStaticEnabled,
			SortOrder:        40,
			Metadata: map[string]any{
				"source":       "account_onboarding",
				"qr_image_url": req.QRISImageURL,
			},
		},
	}

	if _, err := tx.ExecContext(ctx, `DELETE FROM tenant_payment_methods WHERE tenant_id = $1`, tenantID); err != nil {
		return err
	}

	now := time.Now().UTC()
	for _, method := range methods {
		meta, _ := json.Marshal(method.Metadata)
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO tenant_payment_methods (
				id, tenant_id, code, display_name, category, verification_type,
				provider, instructions, is_active, sort_order, metadata, created_at, updated_at
			)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13)
		`, uuid.New(), tenantID, method.Code, method.DisplayName, method.Category, method.VerificationType,
			method.Provider, method.Instructions, method.IsActive, method.SortOrder, string(meta), now, now); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (r *Repository) UpdateOnboardingBusinessBasics(ctx context.Context, workspaceID uuid.UUID, openTime, closeTime, whatsappNumber string) error {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var tenantID uuid.UUID
	if err := tx.GetContext(ctx, &tenantID, `
		SELECT tenant_id
		FROM workspaces
		WHERE id = $1
	`, workspaceID); err != nil {
		return err
	}

	openTime = defaultClockValue(openTime, "09:00")
	closeTime = defaultClockValue(closeTime, "22:00")
	whatsappNumber = strings.TrimSpace(whatsappNumber)

	if _, err := tx.ExecContext(ctx, `
		UPDATE workspaces
		SET whatsapp_number = $2, updated_at = NOW()
		WHERE id = $1
	`, workspaceID, whatsappNumber); err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, `
		UPDATE tenants
		SET whatsapp_number = $2,
		    open_time = $3,
		    close_time = $4
		WHERE id = $1
	`, tenantID, whatsappNumber, openTime, closeTime); err != nil {
		return err
	}

	return tx.Commit()
}

func (r *Repository) CreateOnboardingFirstBooking(ctx context.Context, workspaceID uuid.UUID, req FirstBookingReq) error {
	req.CustomerName = strings.TrimSpace(req.CustomerName)
	req.CustomerPhone = strings.TrimSpace(req.CustomerPhone)
	req.BookingDate = strings.TrimSpace(req.BookingDate)
	req.BookingTime = strings.TrimSpace(req.BookingTime)
	req.BookingMode = strings.ToLower(strings.TrimSpace(req.BookingMode))
	if req.CustomerName == "" {
		req.CustomerName = "Demo Customer"
	}
	if req.CustomerPhone == "" {
		return errors.New("nomor WhatsApp customer wajib diisi")
	}
	if req.BookingMode != "walkin" {
		req.BookingMode = "scheduled"
	}
	if req.Quantity <= 0 {
		req.Quantity = 1
	}
	if req.BookingDate == "" {
		req.BookingDate = time.Now().In(time.FixedZone("WIB", 7*60*60)).Format("2006-01-02")
	}
	if req.BookingTime == "" {
		return errors.New("slot booking wajib dipilih")
	}

	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	type seedRow struct {
		TenantID     uuid.UUID `db:"tenant_id"`
		ResourceID   uuid.UUID `db:"resource_id"`
		ItemID       uuid.UUID `db:"item_id"`
		ItemName     string    `db:"item_name"`
		Price        int64     `db:"price"`
		UnitDuration int       `db:"unit_duration"`
		Timezone     string    `db:"timezone"`
	}

	var seed seedRow
	if err := tx.GetContext(ctx, &seed, `
		SELECT
			w.tenant_id,
			r.id AS resource_id,
			ri.id AS item_id,
			ri.name AS item_name,
			COALESCE(ri.price, 0) AS price,
			COALESCE(NULLIF(ri.unit_duration, 0), 60) AS unit_duration,
			COALESCE(NULLIF(BTRIM(t.timezone), ''), 'Asia/Jakarta') AS timezone
		FROM workspaces w
		JOIN tenants t ON t.id = w.tenant_id
		JOIN resources r
			ON r.tenant_id = w.tenant_id
			AND r.metadata->>'onboarding_seed' = 'true'
			AND r.status <> 'deleted'
		JOIN resource_items ri
			ON ri.resource_id = r.id
			AND ri.item_type = 'main_option'
			AND ri.is_default = TRUE
		WHERE w.id = $1
		ORDER BY r.created_at DESC
		LIMIT 1
	`, workspaceID); err != nil {
		if err == sql.ErrNoRows {
			return errors.New("buat resource onboarding dulu sebelum simulasi booking")
		}
		return err
	}

	var existingID uuid.UUID
	existingErr := tx.GetContext(ctx, &existingID, `
		SELECT be.booking_id
		FROM booking_events be
		JOIN bookings b ON b.id = be.booking_id
		WHERE be.tenant_id = $1
		  AND be.event_type = 'onboarding.first_booking_created'
		  AND be.metadata->>'workspace_id' = $2
		  AND b.status <> 'cancelled'
		ORDER BY be.created_at DESC
		LIMIT 1
	`, seed.TenantID, workspaceID.String())
	if existingErr == nil {
		return tx.Commit()
	}
	if existingErr != nil && existingErr != sql.ErrNoRows {
		return existingErr
	}

	location, err := time.LoadLocation(seed.Timezone)
	if err != nil {
		location = time.FixedZone("WIB", 7*60*60)
	}
	startLocal, err := time.ParseInLocation("2006-01-02 15:04", req.BookingDate+" "+req.BookingTime, location)
	if err != nil {
		return errors.New("format tanggal atau jam booking tidak valid")
	}
	start := startLocal.UTC()
	end := start.Add(time.Duration(seed.UnitDuration*req.Quantity) * time.Minute)

	var overlapCount int
	if err := tx.GetContext(ctx, &overlapCount, `
		SELECT COUNT(*)
		FROM bookings
		WHERE resource_id = $1
		  AND status NOT IN ('cancelled', 'rejected')
		  AND (start_time, end_time) OVERLAPS ($2, $3)
	`, seed.ResourceID, start, end); err != nil {
		return err
	}
	if overlapCount > 0 {
		return errors.New("slot booking onboarding sudah terisi")
	}

	var customerID uuid.UUID
	if err := tx.GetContext(ctx, &customerID, `
		INSERT INTO customers (
			id, name, phone, total_visits, total_spent, tier, loyalty_points,
			account_status, account_stage, registration_source, silent_registered_at,
			phone_verified_at, country_code, created_at, updated_at
		) VALUES (
			$1, $2, $3, 0, 0, 'NEW', 0,
			'verified', 'provisioned', 'onboarding', NOW(),
			NOW(), 'ID', NOW(), NOW()
		)
		ON CONFLICT (phone)
		DO UPDATE SET
			name = CASE
				WHEN COALESCE(BTRIM(customers.name), '') = '' THEN EXCLUDED.name
				ELSE customers.name
			END,
			silent_registered_at = COALESCE(customers.silent_registered_at, NOW()),
			registration_source = COALESCE(NULLIF(customers.registration_source, ''), 'onboarding'),
			account_stage = CASE
				WHEN COALESCE(customers.account_stage, '') = '' THEN 'provisioned'
				ELSE customers.account_stage
			END,
			updated_at = NOW()
		RETURNING id
	`, uuid.New(), req.CustomerName, req.CustomerPhone); err != nil {
		return err
	}

	status := "pending"
	paymentStatus := "pending"
	paymentMethod := "cash"
	var sessionActivatedAt *time.Time
	now := time.Now().UTC()
	if req.BookingMode == "walkin" {
		status = "active"
		paymentStatus = "unpaid"
		sessionActivatedAt = &now
	}

	bookingID := uuid.New()
	accessToken := uuid.New()
	grandTotal := seed.Price * int64(req.Quantity)
	originalGrandTotal := float64(grandTotal)
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO bookings (
			id, tenant_id, customer_id, resource_id, start_time, end_time, access_token,
			status, original_grand_total, discount_amount, promo_snapshot,
			grand_total, deposit_amount, paid_amount, balance_due, payment_status, payment_method,
			session_activated_at, last_status_changed_at, created_at
		)
		VALUES (
			$1, $2, $3, $4, $5, $6, $7,
			$8, $9, 0::double precision, '{}'::jsonb,
			$10, 0, 0, $10, $11, $12,
			$13, NOW(), NOW()
		)
	`, bookingID, seed.TenantID, customerID, seed.ResourceID, start, end, accessToken, status, originalGrandTotal, grandTotal, paymentStatus, paymentMethod, sessionActivatedAt); err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO booking_options (id, booking_id, resource_item_id, quantity, price_at_booking)
		VALUES ($1, $2, $3, $4, $5)
	`, uuid.New(), bookingID, seed.ItemID, req.Quantity, grandTotal); err != nil {
		return err
	}

	metadata := map[string]any{
		"workspace_id":  workspaceID.String(),
		"booking_mode":  req.BookingMode,
		"quantity":      req.Quantity,
		"resource_item": seed.ItemName,
		"source":        "account_onboarding",
	}
	metadataJSON, _ := json.Marshal(metadata)
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO booking_events (
			id, booking_id, tenant_id, customer_id, actor_type, actor_name, actor_email, actor_role, event_type, title, description, metadata, created_at
		)
		VALUES ($1, $2, $3, $4, 'system', '', '', '', 'onboarding.first_booking_created', $5, $6, $7::jsonb, NOW())
	`, uuid.New(), bookingID, seed.TenantID, customerID, "Booking pertama dibuat dari onboarding", "Booking ini dibuat dari simulasi onboarding agar langsung muncul di admin.", string(metadataJSON)); err != nil {
		return err
	}

	return tx.Commit()
}

func (r *Repository) GetWorkspaceTenantIDForAccount(ctx context.Context, accountID, workspaceID uuid.UUID) (uuid.UUID, error) {
	var tenantID uuid.UUID
	err := r.db.GetContext(ctx, &tenantID, `
		SELECT w.tenant_id
		FROM workspaces w
		JOIN workspace_memberships wm ON wm.workspace_id = w.id
		WHERE w.id = $1
		  AND wm.account_id = $2
		  AND wm.status = 'active'
	`, workspaceID, accountID)
	return tenantID, err
}

type WorkspaceAdminContext struct {
	WorkspaceID        uuid.UUID      `db:"workspace_id"`
	TenantID           uuid.UUID      `db:"tenant_id"`
	AdminUserID        uuid.UUID      `db:"admin_user_id"`
	Role               string         `db:"role"`
	PermissionKeys     pq.StringArray `db:"permission_keys"`
	Plan               string         `db:"plan"`
	SubscriptionStatus string         `db:"subscription_status"`
}

func (r *Repository) GetWorkspaceAdminContext(ctx context.Context, accountID uuid.UUID, tenantID string) (*WorkspaceAdminContext, error) {
	tenantID = strings.TrimSpace(tenantID)
	if tenantID == "" {
		return nil, sql.ErrNoRows
	}

	var item WorkspaceAdminContext
	err := r.db.GetContext(ctx, &item, `
		SELECT
			w.id AS workspace_id,
			w.tenant_id,
			wm.admin_user_id,
			wm.role,
			wm.permission_keys,
			w.plan,
			w.subscription_status
		FROM workspaces w
		JOIN workspace_memberships wm ON wm.workspace_id = w.id
		WHERE wm.account_id = $1
		  AND w.tenant_id = $2
		  AND wm.status = 'active'
		LIMIT 1
	`, accountID, tenantID)
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *Repository) UpdateOnboardingState(ctx context.Context, workspaceID uuid.UUID, stepKey, nextStep, selectedStartMode string, complete bool) (*OnboardingState, error) {
	var item OnboardingState
	err := r.db.GetContext(ctx, &item, `
		UPDATE workspace_onboarding_states
		SET
			current_step = $2,
			completed_steps = (
				SELECT ARRAY(
					SELECT DISTINCT unnest(completed_steps || $3::text[])
				)
			),
			selected_start_mode = CASE WHEN $4 <> '' THEN $4 ELSE selected_start_mode END,
			is_completed = $5,
			completed_at = CASE WHEN $5 THEN COALESCE(completed_at, NOW()) ELSE completed_at END,
			updated_at = NOW()
		WHERE workspace_id = $1
		RETURNING workspace_id, current_step, completed_steps, selected_start_mode, is_completed, started_at, completed_at, updated_at
	`, workspaceID, nextStep, pq.StringArray{stepKey}, selectedStartMode, complete)
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *Repository) InsertOnboardingEvent(ctx context.Context, workspaceID, accountID uuid.UUID, eventKey, stepKey string) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO workspace_onboarding_events (workspace_id, account_id, event_key, step_key)
		VALUES ($1, $2, $3, $4)
	`, workspaceID, accountID, eventKey, stepKey)
	return err
}

func defaultOnboardingResourceDescription(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed != "" {
		return trimmed
	}
	return "Resource pertama dari onboarding Bookinaja."
}

func anyToString(value any) string {
	switch typed := value.(type) {
	case string:
		return typed
	default:
		return ""
	}
}

func defaultClockValue(value, fallback string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return fallback
	}
	return trimmed
}

func (r *Repository) invalidateWorkspacePublicCache(ctx context.Context, tenantID uuid.UUID, slug string) {
	if r.rdb == nil {
		return
	}
	slug = strings.ToLower(strings.TrimSpace(slug))
	if slug == "" && tenantID != uuid.Nil {
		_ = r.db.GetContext(ctx, &slug, `SELECT LOWER(TRIM(slug)) FROM tenants WHERE id = $1`, tenantID)
	}

	keys := []string{
		"tenant:public:list",
		"discover:public:feed:v1",
	}
	if slug != "" {
		keys = append(keys,
			fmt.Sprintf("tenant:profile:slug:%s", slug),
			fmt.Sprintf("tenant:public_profile:slug:%s", slug),
			fmt.Sprintf("landing:full:%s", slug),
			fmt.Sprintf("tenant_id_by_slug:%s", slug),
		)
	}
	if tenantID != uuid.Nil {
		keys = append(keys,
			fmt.Sprintf("tenant:profile:id:%s", tenantID.String()),
			fmt.Sprintf("katalog_resources:%s", tenantID.String()),
			fmt.Sprintf("public:katalog_resources:%s", tenantID.String()),
		)
	}

	_ = r.rdb.Del(ctx, keys...).Err()
}

func generateWorkspaceReferralCode(slug string) string {
	base := strings.ToUpper(strings.TrimSpace(slug))
	base = strings.ReplaceAll(base, " ", "")
	base = strings.ReplaceAll(base, ".", "")
	base = strings.ReplaceAll(base, "-", "")
	if base == "" {
		base = "BOOK"
	}
	if len(base) > 8 {
		base = base[:8]
	}
	return fmt.Sprintf("%s%s", base, strings.ToUpper(uuid.NewString()[:4]))
}
