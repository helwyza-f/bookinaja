package paymentgateway

import (
	"context"
	"database/sql"
	"strings"
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

type row struct {
	ID                uuid.UUID  `db:"id"`
	TenantID          uuid.UUID  `db:"tenant_id"`
	Provider          string     `db:"provider"`
	Environment       string     `db:"environment"`
	ServerKeyEnc      []byte     `db:"server_key_enc"`
	ClientKey         string     `db:"client_key"`
	CallbackSecretEnc []byte     `db:"callback_secret_enc"`
	Status            string     `db:"status"`
	LastError         string     `db:"last_error"`
	VerifiedAt        *time.Time `db:"verified_at"`
	CreatedAt         time.Time  `db:"created_at"`
	UpdatedAt         time.Time  `db:"updated_at"`
}

// UpsertInput adalah data mentah dari owner. Field secret kosong = "jangan
// ubah" saat baris sudah ada (supaya owner bisa update client_key/environment
// tanpa mengetik ulang server key).
type UpsertInput struct {
	Provider       string
	Environment    string
	ServerKey      string
	ClientKey      string
	CallbackSecret string
}

func normalizeProvider(p string) string {
	switch strings.ToLower(strings.TrimSpace(p)) {
	case ProviderXendit:
		return ProviderXendit
	default:
		return ProviderMidtrans
	}
}

func normalizeEnv(e string) string {
	if strings.ToLower(strings.TrimSpace(e)) == EnvProduction {
		return EnvProduction
	}
	return EnvSandbox
}

// Upsert menyimpan kredensial tenant. Setiap perubahan mengembalikan status ke
// "unverified" (harus di-test-koneksi ulang). Server/callback secret kosong
// dipertahankan dari baris lama.
func (r *Repository) Upsert(ctx context.Context, tenantID uuid.UUID, in UpsertInput) error {
	existing, _ := r.get(ctx, tenantID)

	serverKey := strings.TrimSpace(in.ServerKey)
	serverEnc, err := encrypt(serverKey)
	if err != nil {
		return err
	}
	if serverKey == "" && existing != nil {
		serverEnc = existing.ServerKeyEnc
	}

	callback := strings.TrimSpace(in.CallbackSecret)
	callbackEnc, err := encrypt(callback)
	if err != nil {
		return err
	}
	if callback == "" && existing != nil {
		callbackEnc = existing.CallbackSecretEnc
	}

	_, err = r.db.ExecContext(ctx, `
		INSERT INTO tenant_payment_gateways (
			id, tenant_id, provider, environment, server_key_enc, client_key,
			callback_secret_enc, status, last_error, verified_at, created_at, updated_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,'unverified','',NULL,NOW(),NOW())
		ON CONFLICT (tenant_id) DO UPDATE SET
			provider = EXCLUDED.provider,
			environment = EXCLUDED.environment,
			server_key_enc = EXCLUDED.server_key_enc,
			client_key = EXCLUDED.client_key,
			callback_secret_enc = EXCLUDED.callback_secret_enc,
			status = 'unverified',
			last_error = '',
			verified_at = NULL,
			updated_at = NOW()`,
		uuid.New(), tenantID, normalizeProvider(in.Provider), normalizeEnv(in.Environment),
		serverEnc, strings.TrimSpace(in.ClientKey), callbackEnc,
	)
	return err
}

func (r *Repository) get(ctx context.Context, tenantID uuid.UUID) (*row, error) {
	var rw row
	err := r.db.GetContext(ctx, &rw, `
		SELECT id, tenant_id, provider, environment, server_key_enc, client_key,
			callback_secret_enc, status, last_error, verified_at, created_at, updated_at
		FROM tenant_payment_gateways
		WHERE tenant_id = $1
		LIMIT 1`, tenantID)
	if err != nil {
		return nil, err
	}
	return &rw, nil
}

// GetCredential mengembalikan kredensial terdekripsi, atau (nil,nil) bila tenant
// belum mengonfigurasi BYO gateway.
func (r *Repository) GetCredential(ctx context.Context, tenantID uuid.UUID) (*Credential, error) {
	rw, err := r.get(ctx, tenantID)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	serverKey, err := decrypt(rw.ServerKeyEnc)
	if err != nil {
		return nil, err
	}
	callback, err := decrypt(rw.CallbackSecretEnc)
	if err != nil {
		return nil, err
	}
	return &Credential{
		TenantID:       rw.TenantID,
		Provider:       rw.Provider,
		Environment:    rw.Environment,
		ServerKey:      serverKey,
		ClientKey:      rw.ClientKey,
		CallbackSecret: callback,
		Status:         rw.Status,
	}, nil
}

// GetPublicConfig aman untuk frontend (tanpa server key). Configured=true hanya
// bila status verified.
func (r *Repository) GetPublicConfig(ctx context.Context, tenantID uuid.UUID) (PublicConfig, error) {
	rw, err := r.get(ctx, tenantID)
	if err == sql.ErrNoRows {
		return PublicConfig{}, nil
	}
	if err != nil {
		return PublicConfig{}, err
	}
	return PublicConfig{
		Provider:    rw.Provider,
		Environment: rw.Environment,
		ClientKey:   rw.ClientKey,
		Configured:  rw.Status == StatusVerified,
	}, nil
}

// GetAdminView untuk owner (secret di-mask).
func (r *Repository) GetAdminView(ctx context.Context, tenantID uuid.UUID) (*AdminView, error) {
	rw, err := r.get(ctx, tenantID)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	serverKey, _ := decrypt(rw.ServerKeyEnc)
	return &AdminView{
		Provider:          rw.Provider,
		Environment:       rw.Environment,
		ClientKey:         rw.ClientKey,
		ServerKeyMasked:   maskSecret(serverKey),
		ServerKeySet:      len(rw.ServerKeyEnc) > 0,
		CallbackSecretSet: len(rw.CallbackSecretEnc) > 0,
		Status:            rw.Status,
		LastError:         rw.LastError,
		VerifiedAt:        rw.VerifiedAt,
		UpdatedAt:         rw.UpdatedAt,
	}, nil
}

func (r *Repository) MarkVerified(ctx context.Context, tenantID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE tenant_payment_gateways
		SET status = 'verified', last_error = '', verified_at = NOW(), updated_at = NOW()
		WHERE tenant_id = $1`, tenantID)
	return err
}

func (r *Repository) MarkError(ctx context.Context, tenantID uuid.UUID, msg string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE tenant_payment_gateways
		SET status = 'unverified', last_error = $2, verified_at = NULL, updated_at = NOW()
		WHERE tenant_id = $1`, tenantID, strings.TrimSpace(msg))
	return err
}

func (r *Repository) Disable(ctx context.Context, tenantID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE tenant_payment_gateways
		SET status = 'disabled', updated_at = NOW()
		WHERE tenant_id = $1`, tenantID)
	return err
}
