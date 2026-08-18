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
	IsActive          bool       `db:"is_active"`
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
// Upsert menyimpan konfigurasi SATU provider (Midtrans atau Xendit) tanpa
// mengganggu provider lain (baris per (tenant_id, provider)). Provider yang
// disimpan otomatis dijadikan aktif. Field rahasia kosong = pertahankan lama.
func (r *Repository) Upsert(ctx context.Context, tenantID uuid.UUID, in UpsertInput) error {
	provider := normalizeProvider(in.Provider)
	existing, _ := r.getByProvider(ctx, tenantID, provider)

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

	if _, err = r.db.ExecContext(ctx, `
		INSERT INTO tenant_payment_gateways (
			id, tenant_id, provider, environment, server_key_enc, client_key,
			callback_secret_enc, status, last_error, verified_at, is_active, created_at, updated_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,'unverified','',NULL,true,NOW(),NOW())
		ON CONFLICT (tenant_id, provider) DO UPDATE SET
			environment = EXCLUDED.environment,
			server_key_enc = EXCLUDED.server_key_enc,
			client_key = EXCLUDED.client_key,
			callback_secret_enc = EXCLUDED.callback_secret_enc,
			status = 'unverified',
			last_error = '',
			verified_at = NULL,
			is_active = true,
			updated_at = NOW()`,
		uuid.New(), tenantID, provider, normalizeEnv(in.Environment),
		serverEnc, strings.TrimSpace(in.ClientKey), callbackEnc,
	); err != nil {
		return err
	}
	// Provider yang baru disimpan menjadi satu-satunya yang aktif.
	return r.setActive(ctx, tenantID, provider)
}

// setActive menjadikan satu provider aktif & menonaktifkan sisanya (transaksi
// tunggal via UPDATE kondisional).
func (r *Repository) setActive(ctx context.Context, tenantID uuid.UUID, provider string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE tenant_payment_gateways
		SET is_active = (provider = $2), updated_at = NOW()
		WHERE tenant_id = $1`, tenantID, normalizeProvider(provider))
	return err
}

// SetActive dipanggil dari admin untuk berpindah provider aktif tanpa isi ulang
// kredensial. Hanya berlaku bila baris provider tsb ada.
func (r *Repository) SetActive(ctx context.Context, tenantID uuid.UUID, provider string) error {
	if _, err := r.getByProvider(ctx, tenantID, provider); err != nil {
		return err
	}
	return r.setActive(ctx, tenantID, provider)
}

const rowCols = `id, tenant_id, provider, environment, server_key_enc, client_key,
	callback_secret_enc, status, last_error, verified_at, is_active, created_at, updated_at`

// get mengembalikan baris gateway AKTIF tenant (dipakai charge/webhook/web).
func (r *Repository) get(ctx context.Context, tenantID uuid.UUID) (*row, error) {
	var rw row
	err := r.db.GetContext(ctx, &rw, `
		SELECT `+rowCols+`
		FROM tenant_payment_gateways
		WHERE tenant_id = $1 AND is_active = true
		LIMIT 1`, tenantID)
	if err != nil {
		return nil, err
	}
	return &rw, nil
}

// getByProvider mengembalikan baris gateway satu provider tertentu (mobile).
func (r *Repository) getByProvider(ctx context.Context, tenantID uuid.UUID, provider string) (*row, error) {
	var rw row
	err := r.db.GetContext(ctx, &rw, `
		SELECT `+rowCols+`
		FROM tenant_payment_gateways
		WHERE tenant_id = $1 AND provider = $2
		LIMIT 1`, tenantID, normalizeProvider(provider))
	if err != nil {
		return nil, err
	}
	return &rw, nil
}

// listRows mengembalikan semua baris gateway tenant (semua provider).
func (r *Repository) listRows(ctx context.Context, tenantID uuid.UUID) ([]row, error) {
	var rows []row
	err := r.db.SelectContext(ctx, &rows, `
		SELECT `+rowCols+`
		FROM tenant_payment_gateways
		WHERE tenant_id = $1
		ORDER BY provider`, tenantID)
	return rows, err
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

func (r *Repository) toAdminView(rw *row) *AdminView {
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
		IsActive:          rw.IsActive,
		UpdatedAt:         rw.UpdatedAt,
	}
}

// GetAdminView: baris AKTIF (dipakai web & endpoint lama).
func (r *Repository) GetAdminView(ctx context.Context, tenantID uuid.UUID) (*AdminView, error) {
	rw, err := r.get(ctx, tenantID)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return r.toAdminView(rw), nil
}

// GetAdminViewByProvider: baris satu provider (mobile).
func (r *Repository) GetAdminViewByProvider(ctx context.Context, tenantID uuid.UUID, provider string) (*AdminView, error) {
	rw, err := r.getByProvider(ctx, tenantID, provider)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return r.toAdminView(rw), nil
}

// ListAdminViews: semua provider tersimpan (mobile — kelola berdampingan).
func (r *Repository) ListAdminViews(ctx context.Context, tenantID uuid.UUID) ([]AdminView, error) {
	rows, err := r.listRows(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	views := make([]AdminView, 0, len(rows))
	for i := range rows {
		views = append(views, *r.toAdminView(&rows[i]))
	}
	return views, nil
}

// GetCredentialByProvider dipakai untuk tes koneksi provider tertentu.
func (r *Repository) GetCredentialByProvider(ctx context.Context, tenantID uuid.UUID, provider string) (*Credential, error) {
	rw, err := r.getByProvider(ctx, tenantID, provider)
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

func (r *Repository) MarkVerified(ctx context.Context, tenantID uuid.UUID, provider string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE tenant_payment_gateways
		SET status = 'verified', last_error = '', verified_at = NOW(), updated_at = NOW()
		WHERE tenant_id = $1 AND provider = $2`, tenantID, normalizeProvider(provider))
	return err
}

func (r *Repository) MarkError(ctx context.Context, tenantID uuid.UUID, provider, msg string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE tenant_payment_gateways
		SET status = 'unverified', last_error = $3, verified_at = NULL, updated_at = NOW()
		WHERE tenant_id = $1 AND provider = $2`, tenantID, normalizeProvider(provider), strings.TrimSpace(msg))
	return err
}

func (r *Repository) Disable(ctx context.Context, tenantID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE tenant_payment_gateways
		SET status = 'disabled', updated_at = NOW()
		WHERE tenant_id = $1 AND is_active = true`, tenantID)
	return err
}

// Delete menghapus SEMUA konfigurasi gateway tenant (hard delete). Dipakai
// endpoint lama tanpa provider (kompatibel web).
func (r *Repository) Delete(ctx context.Context, tenantID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, `
		DELETE FROM tenant_payment_gateways
		WHERE tenant_id = $1`, tenantID)
	return err
}

// DeleteByProvider menghapus satu provider. Bila yang dihapus adalah provider
// aktif dan masih ada provider lain, provider tersisa dipromosikan jadi aktif.
func (r *Repository) DeleteByProvider(ctx context.Context, tenantID uuid.UUID, provider string) error {
	if _, err := r.db.ExecContext(ctx, `
		DELETE FROM tenant_payment_gateways
		WHERE tenant_id = $1 AND provider = $2`, tenantID, normalizeProvider(provider)); err != nil {
		return err
	}
	// Pastikan tetap ada satu baris aktif bila masih ada provider tersisa.
	_, err := r.db.ExecContext(ctx, `
		UPDATE tenant_payment_gateways
		SET is_active = true, updated_at = NOW()
		WHERE tenant_id = $1
		  AND NOT EXISTS (
			SELECT 1 FROM tenant_payment_gateways WHERE tenant_id = $1 AND is_active = true
		  )
		  AND id = (SELECT id FROM tenant_payment_gateways WHERE tenant_id = $1 ORDER BY provider LIMIT 1)`,
		tenantID)
	return err
}
