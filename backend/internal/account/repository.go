package account

import (
	"context"
	"database/sql"
	"encoding/json"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
)

type Repository struct {
	db *sqlx.DB
}

func NewRepository(db *sqlx.DB) *Repository {
	return &Repository{db: db}
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
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO tenants (
			id, name, slug, business_category, business_type,
			plan, subscription_status, timezone, whatsapp_number,
			tagline, about_us, primary_color, created_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
	`, tenantID, workspace.Name, workspace.Slug, workspace.BusinessCategory, workspace.BusinessType,
		workspace.Plan, workspace.SubscriptionStatus, workspace.Timezone, workspace.WhatsappNumber,
		"Booking simpel untuk bisnis yang bergerak cepat.", "Kelola reservasi, resource, customer, dan pembayaran dari satu workspace.", "#2563eb"); err != nil {
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
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &item, nil
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

func (r *Repository) CreateOnboardingResource(ctx context.Context, workspaceID uuid.UUID, name, category, priceName string, price int64, priceUnit string, unitDuration int) error {
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

	var exists bool
	if err := tx.GetContext(ctx, &exists, `
		SELECT EXISTS (
			SELECT 1
			FROM resources
			WHERE tenant_id = $1
			  AND metadata->>'onboarding_seed' = 'true'
			  AND status <> 'deleted'
		)
	`, tenantID); err != nil {
		return err
	}
	if exists {
		return tx.Commit()
	}

	resourceID := uuid.New()
	meta, _ := json.Marshal(map[string]any{
		"onboarding_seed": true,
		"source":          "account_onboarding",
	})
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO resources (
			id, tenant_id, name, category, description,
			operating_mode, image_url, gallery, status, metadata
		)
		VALUES ($1, $2, $3, $4, $5, 'timed', '', '{}', 'available', $6::jsonb)
	`, resourceID, tenantID, name, category, "Resource pertama dari onboarding Bookinaja.", string(meta)); err != nil {
		return err
	}

	itemMeta, _ := json.Marshal(map[string]any{
		"onboarding_seed": true,
		"source":          "account_onboarding",
	})
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO resource_items (
			id, resource_id, name, price, price_unit,
			unit_duration, item_type, is_default, metadata
		)
		VALUES ($1, $2, $3, $4, $5, $6, 'main_option', TRUE, $7::jsonb)
	`, uuid.New(), resourceID, priceName, price, priceUnit, unitDuration, string(itemMeta)); err != nil {
		return err
	}

	return tx.Commit()
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
