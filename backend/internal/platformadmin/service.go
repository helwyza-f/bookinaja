package platformadmin

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/helwiza/backend/internal/platform/mailer"
	"golang.org/x/crypto/bcrypt"
)

type Service struct {
	mailer mailer.Provider
	repo   *Repository
}

func NewService(m mailer.Provider, repo *Repository) *Service { return &Service{mailer: m, repo: repo} }

func (s *Service) Authenticate(email, password string) error {
	adminEmail := strings.TrimSpace(os.Getenv("PLATFORM_ADMIN_EMAIL"))
	adminPassword := os.Getenv("PLATFORM_ADMIN_PASSWORD")
	if adminEmail == "" || adminPassword == "" {
		return errors.New("platform admin credentials not configured")
	}
	if !strings.EqualFold(strings.TrimSpace(email), adminEmail) {
		return errors.New("invalid credentials")
	}
	// Support plain text in local env and bcrypt hash if provided
	if strings.HasPrefix(adminPassword, "$2a$") || strings.HasPrefix(adminPassword, "$2b$") {
		return bcrypt.CompareHashAndPassword([]byte(adminPassword), []byte(password))
	}
	if adminPassword != password {
		return errors.New("invalid credentials")
	}
	return nil
}

func (s *Service) BuildSessionToken() (string, time.Time) {
	return "", time.Now()
}

func (s *Service) SendEmail(ctx context.Context, req mailer.SendRequest) (*mailer.SendResponse, error) {
	if s.mailer == nil || !s.mailer.Enabled() {
		return nil, errors.New("resend belum dikonfigurasi di backend")
	}
	if len(req.To) == 0 {
		return nil, errors.New("penerima email wajib diisi")
	}
	if strings.TrimSpace(req.Subject) == "" {
		return nil, errors.New("subject email wajib diisi")
	}
	if strings.TrimSpace(req.HTML) == "" && strings.TrimSpace(req.Text) == "" {
		return nil, errors.New("isi email html atau text wajib diisi")
	}

	cleanTo := make([]string, 0, len(req.To))
	for _, item := range req.To {
		if trimmed := strings.TrimSpace(item); trimmed != "" {
			cleanTo = append(cleanTo, trimmed)
		}
	}
	if len(cleanTo) == 0 {
		return nil, errors.New("penerima email wajib diisi")
	}
	req.To = cleanTo

	eventKey := strings.TrimSpace(req.Tags["event_key"])
	if eventKey == "" {
		eventKey = "platform_manual"
	}
	source := strings.TrimSpace(req.Tags["source"])
	if source == "" {
		source = "platform_admin"
	}
	templateKey := strings.TrimSpace(req.Tags["template_key"])

	logID, err := s.repo.CreateEmailLog(ctx, CreateEmailLogInput{
		Provider:       "resend",
		Source:         source,
		EventKey:       eventKey,
		TemplateKey:    templateKey,
		Recipient:      cleanTo[0],
		Subject:        strings.TrimSpace(req.Subject),
		Status:         "queued",
		RequestPayload: req,
		Tags:           req.Tags,
	})
	if err != nil {
		return nil, fmt.Errorf("gagal mencatat log email: %w", err)
	}

	resp, err := s.mailer.Send(ctx, req)
	if err != nil {
		_ = s.repo.UpdateEmailLogDispatch(ctx, logID, "", "failed", err.Error())
		return nil, err
	}
	_ = s.repo.UpdateEmailLogDispatch(ctx, logID, resp.ID, "accepted", "")
	return resp, nil
}

func (s *Service) ListSentEmails(ctx context.Context, limit int) (*mailer.SentListResponse, error) {
	if s.mailer == nil || !s.mailer.Enabled() {
		return nil, errors.New("resend belum dikonfigurasi di backend")
	}
	return s.mailer.ListSent(ctx, normalizeListLimit(limit))
}

func (s *Service) GetSentEmail(ctx context.Context, id string) (*mailer.SentEmail, error) {
	if s.mailer == nil || !s.mailer.Enabled() {
		return nil, errors.New("resend belum dikonfigurasi di backend")
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, fmt.Errorf("id email wajib diisi")
	}
	return s.mailer.GetSent(ctx, id)
}

func (s *Service) ListReceivedEmails(ctx context.Context, limit int) (*mailer.ReceivedListResponse, error) {
	if s.mailer == nil || !s.mailer.Enabled() {
		return nil, errors.New("resend belum dikonfigurasi di backend")
	}
	return s.mailer.ListReceived(ctx, normalizeListLimit(limit))
}

func (s *Service) GetReceivedEmail(ctx context.Context, id string) (*mailer.ReceivedEmail, error) {
	if s.mailer == nil || !s.mailer.Enabled() {
		return nil, errors.New("resend belum dikonfigurasi di backend")
	}
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, fmt.Errorf("id email wajib diisi")
	}
	return s.mailer.GetReceived(ctx, id)
}

func normalizeListLimit(limit int) int {
	if limit <= 0 {
		return 20
	}
	if limit > 100 {
		return 100
	}
	return limit
}

func (s *Service) ListEmailLogs(ctx context.Context, page, pageSize int, eventKey, status, query string) ([]map[string]any, int, error) {
	return s.repo.ListEmailLogs(ctx, page, pageSize, eventKey, status, query)
}

func (s *Service) GetEmailLog(ctx context.Context, id string) (map[string]any, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, fmt.Errorf("id log email wajib diisi")
	}
	return s.repo.GetEmailLog(ctx, id)
}
