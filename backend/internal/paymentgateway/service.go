package paymentgateway

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
)

type Service struct {
	repo *Repository
	http *http.Client
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo, http: &http.Client{Timeout: 15 * time.Second}}
}

func (s *Service) Get(ctx context.Context, tenantID uuid.UUID) (*AdminView, error) {
	return s.repo.GetAdminView(ctx, tenantID)
}

func (s *Service) Save(ctx context.Context, tenantID uuid.UUID, in UpsertInput) (*AdminView, error) {
	if !MasterKeyReady() {
		return nil, ErrNoMasterKey
	}
	in.Provider = normalizeProvider(in.Provider)
	in.Environment = normalizeEnv(in.Environment)
	if err := s.repo.Upsert(ctx, tenantID, in); err != nil {
		return nil, err
	}
	return s.repo.GetAdminView(ctx, tenantID)
}

func (s *Service) Disable(ctx context.Context, tenantID uuid.UUID) error {
	return s.repo.Disable(ctx, tenantID)
}

// TestConnection memverifikasi kredensial dengan memanggil endpoint ringan
// gateway (tanpa membuat transaksi nyata). Sukses → status verified.
func (s *Service) TestConnection(ctx context.Context, tenantID uuid.UUID) (*AdminView, error) {
	cred, err := s.repo.GetCredential(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	if cred == nil || strings.TrimSpace(cred.ServerKey) == "" {
		return nil, fmt.Errorf("server key belum diisi")
	}

	var testErr error
	if cred.Provider == ProviderXendit {
		testErr = s.pingXendit(ctx, cred.ServerKey)
	} else {
		testErr = s.pingMidtrans(ctx, cred.ServerKey, cred.IsProduction())
	}

	if testErr != nil {
		_ = s.repo.MarkError(ctx, tenantID, testErr.Error())
		return nil, testErr
	}
	if err := s.repo.MarkVerified(ctx, tenantID); err != nil {
		return nil, err
	}
	return s.repo.GetAdminView(ctx, tenantID)
}

// pingXendit: GET /balance. 200 = key valid; 401 = key salah.
func (s *Service) pingXendit(ctx context.Context, secret string) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.xendit.co/balance", nil)
	if err != nil {
		return err
	}
	req.SetBasicAuth(strings.TrimSpace(secret), "")
	resp, err := s.http.Do(req)
	if err != nil {
		return fmt.Errorf("gagal menghubungi Xendit: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
		return fmt.Errorf("secret key Xendit ditolak (HTTP %d)", resp.StatusCode)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("Xendit membalas HTTP %d", resp.StatusCode)
	}
	return nil
}

// pingMidtrans: GET status order acak di Core API. 404 = key valid (order tidak
// ada); 401 = key salah.
func (s *Service) pingMidtrans(ctx context.Context, serverKey string, production bool) error {
	base := "https://api.sandbox.midtrans.com"
	if production {
		base = "https://api.midtrans.com"
	}
	url := base + "/v2/" + uuid.NewString() + "/status"
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	req.SetBasicAuth(strings.TrimSpace(serverKey), "")
	resp, err := s.http.Do(req)
	if err != nil {
		return fmt.Errorf("gagal menghubungi Midtrans: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusUnauthorized {
		return fmt.Errorf("server key Midtrans ditolak (HTTP 401)")
	}
	// 404 (order tidak ditemukan) atau 200/2xx → autentikasi diterima.
	if resp.StatusCode == http.StatusNotFound || (resp.StatusCode >= 200 && resp.StatusCode < 300) {
		return nil
	}
	return fmt.Errorf("Midtrans membalas HTTP %d", resp.StatusCode)
}

// PublicConfig untuk sisi customer (gating metode + client key Snap runtime).
func (s *Service) PublicConfig(ctx context.Context, tenantID uuid.UUID) (PublicConfig, error) {
	return s.repo.GetPublicConfig(ctx, tenantID)
}
