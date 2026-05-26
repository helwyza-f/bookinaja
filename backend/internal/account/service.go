package account

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/helwiza/backend/internal/auth"
	platformenv "github.com/helwiza/backend/internal/platform/env"
	"github.com/helwiza/backend/internal/platform/mailer"
	"github.com/helwiza/backend/internal/platformadmin"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
	"google.golang.org/api/idtoken"
)

const accountEmailActionTTL = 30 * time.Minute

const accountEmailActionVerify = "verify-email"

var errAccountEmailNotVerified = errors.New("email akun belum diverifikasi")

type Service struct {
	repo       *Repository
	authSvc    *auth.Service
	redis      *redis.Client
	mailer     mailer.Provider
	emailAudit *platformadmin.Repository
}

type serviceOption func(*Service)

var onboardingSteps = []string{
	"workspace",
	"template",
	"resource",
	"business",
	"payments",
	"first-booking",
	"done",
}

func WithRedisClient(rdb *redis.Client) serviceOption {
	return func(s *Service) {
		s.redis = rdb
	}
}

func WithMailer(provider mailer.Provider) serviceOption {
	return func(s *Service) {
		s.mailer = provider
	}
}

func WithEmailAudit(logger *platformadmin.Repository) serviceOption {
	return func(s *Service) {
		s.emailAudit = logger
	}
}

func NewService(repo *Repository, authSvc *auth.Service, opts ...serviceOption) *Service {
	svc := &Service{repo: repo, authSvc: authSvc}
	for _, opt := range opts {
		if opt != nil {
			opt(svc)
		}
	}
	return svc
}

func (s *Service) Signup(ctx context.Context, req SignupReq) (*SignupResponse, error) {
	name := strings.TrimSpace(req.Name)
	email := strings.ToLower(strings.TrimSpace(req.Email))
	password := strings.TrimSpace(req.Password)
	if name == "" {
		name = defaultAccountNameFromEmail(email)
	}

	if email == "" || len(password) < 6 {
		return nil, errors.New("email dan password minimal 6 karakter wajib diisi")
	}

	existing, err := s.repo.GetAccountByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		if existing.EmailVerifiedAt == nil {
			return nil, errors.New("email ini sudah terdaftar tapi belum diverifikasi. Cek inbox atau kirim ulang verifikasi")
		}
		return nil, errors.New("email sudah terdaftar")
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	account, err := s.repo.CreateAccount(ctx, Account{
		ID:           uuid.New(),
		Name:         name,
		Email:        email,
		PasswordHash: string(hashed),
	})
	if err != nil {
		return nil, err
	}

	emailSent := true
	message := "Akun Bookinaja dibuat. Cek inbox untuk verifikasi email sebelum login."
	if err := s.sendVerificationEmail(ctx, account); err != nil {
		emailSent = false
		message = "Akun dibuat. Email verifikasi belum terkirim, coba kirim ulang dari halaman verifikasi."
	}

	return &SignupResponse{
		Account:              *account,
		VerificationRequired: true,
		EmailSent:            emailSent,
		Message:              message,
	}, nil
}

func (s *Service) Login(ctx context.Context, req LoginReq) (*AuthResponse, error) {
	email := strings.ToLower(strings.TrimSpace(req.Email))
	password := strings.TrimSpace(req.Password)
	if email == "" || password == "" {
		return nil, errors.New("email dan password wajib diisi")
	}

	account, err := s.repo.GetAccountByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if account == nil || bcrypt.CompareHashAndPassword([]byte(account.PasswordHash), []byte(password)) != nil {
		return nil, errors.New("email atau password tidak valid")
	}
	if account.EmailVerifiedAt == nil {
		return nil, errAccountEmailNotVerified
	}

	token, err := s.authSvc.GenerateAccountToken(account.ID)
	if err != nil {
		return nil, err
	}
	return &AuthResponse{Token: token, Account: *account}, nil
}

func (s *Service) RequestEmailVerification(ctx context.Context, email string) (*EmailVerificationResponse, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" {
		return nil, errors.New("email wajib diisi")
	}

	account, err := s.repo.GetAccountByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if account == nil {
		return &EmailVerificationResponse{
			Email:   email,
			Message: "Kalau akun tersedia, email verifikasi akan dikirim ke inbox kamu.",
		}, nil
	}
	if account.EmailVerifiedAt != nil {
		return &EmailVerificationResponse{
			Email:   email,
			Message: "Email akun ini sudah aktif. Silakan login.",
		}, nil
	}
	if err := s.sendVerificationEmail(ctx, account); err != nil {
		return nil, err
	}
	return &EmailVerificationResponse{
		Email:   email,
		Message: "Link verifikasi baru sudah dikirim. Cek inbox dan folder spam.",
	}, nil
}

func (s *Service) VerifyEmail(ctx context.Context, token string) (*EmailVerificationResponse, error) {
	payload, err := s.consumeEmailAction(ctx, accountEmailActionVerify, strings.TrimSpace(token))
	if err != nil {
		return nil, err
	}

	accountID, err := uuid.Parse(fmt.Sprintf("%v", payload["account_id"]))
	if err != nil {
		return nil, fmt.Errorf("token verifikasi email tidak valid")
	}
	email := strings.ToLower(strings.TrimSpace(fmt.Sprintf("%v", payload["email"])))
	if email == "" {
		return nil, fmt.Errorf("token verifikasi email tidak valid")
	}

	account, err := s.repo.MarkAccountEmailVerified(ctx, accountID, email)
	if err != nil {
		return nil, fmt.Errorf("email belum berhasil diverifikasi")
	}
	if account == nil {
		return nil, fmt.Errorf("email akun sudah berubah. Minta verifikasi baru ya")
	}
	return &EmailVerificationResponse{
		Email:   account.Email,
		Message: "Email akun berhasil diverifikasi. Sekarang kamu bisa login.",
	}, nil
}

func (s *Service) GoogleAuth(ctx context.Context, req GoogleAuthReq) (*AuthResponse, error) {
	identity, err := verifyGoogleIdentity(ctx, req.IDToken)
	if err != nil {
		return nil, err
	}
	if !identity.EmailVerified || identity.Email == "" {
		return nil, errors.New("email Google harus sudah terverifikasi")
	}

	account, err := s.repo.GetAccountByGoogleSubject(ctx, identity.Subject)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	if account == nil {
		existing, err := s.repo.GetAccountByEmail(ctx, identity.Email)
		if err != nil {
			return nil, err
		}
		if existing != nil {
			account, err = s.repo.LinkGoogleAccount(ctx, existing.ID, identity.Subject, identity.Name, identity.Email, &now)
			if err != nil {
				return nil, err
			}
		} else {
			passwordHash, err := bcrypt.GenerateFromPassword([]byte(fmt.Sprintf("google:%s:%s", identity.Subject, uuid.NewString())), bcrypt.DefaultCost)
			if err != nil {
				return nil, err
			}
			subject := identity.Subject
			account, err = s.repo.CreateAccount(ctx, Account{
				ID:              uuid.New(),
				Name:            identity.Name,
				Email:           identity.Email,
				PasswordHash:    string(passwordHash),
				GoogleSubject:   &subject,
				EmailVerifiedAt: &now,
			})
			if err != nil {
				return nil, err
			}
		}
	}

	token, err := s.authSvc.GenerateAccountToken(account.ID)
	if err != nil {
		return nil, err
	}
	return &AuthResponse{Token: token, Account: *account}, nil
}

func (s *Service) Me(ctx context.Context, accountID uuid.UUID) (*AuthMeResponse, error) {
	account, err := s.repo.GetAccountByID(ctx, accountID)
	if err != nil {
		return nil, err
	}
	if account == nil {
		return nil, errors.New("akun tidak ditemukan")
	}

	workspaces, err := s.repo.ListWorkspacesByAccountID(ctx, accountID)
	if err != nil {
		return nil, err
	}

	return &AuthMeResponse{Account: *account, Workspaces: workspaces}, nil
}

type googleIdentity struct {
	Subject       string
	Email         string
	Name          string
	EmailVerified bool
}

func verifyGoogleIdentity(ctx context.Context, rawToken string) (*googleIdentity, error) {
	rawToken = strings.TrimSpace(rawToken)
	if rawToken == "" {
		return nil, errors.New("token Google wajib diisi")
	}

	var lastErr error
	for _, audience := range googleAudiences() {
		payload, err := idtoken.Validate(ctx, rawToken, audience)
		if err != nil {
			lastErr = err
			continue
		}

		identity := &googleIdentity{Subject: strings.TrimSpace(payload.Subject)}
		if payload.Claims != nil {
			if email, _ := payload.Claims["email"].(string); strings.TrimSpace(email) != "" {
				identity.Email = strings.ToLower(strings.TrimSpace(email))
			}
			if name, _ := payload.Claims["name"].(string); strings.TrimSpace(name) != "" {
				identity.Name = strings.TrimSpace(name)
			}
			switch value := payload.Claims["email_verified"].(type) {
			case bool:
				identity.EmailVerified = value
			case string:
				identity.EmailVerified = strings.EqualFold(strings.TrimSpace(value), "true")
			}
		}

		if identity.Subject == "" {
			return nil, errors.New("identitas Google belum valid")
		}
		if identity.Name == "" && identity.Email != "" {
			identity.Name = strings.Split(identity.Email, "@")[0]
		}
		return identity, nil
	}

	if lastErr != nil {
		return nil, errors.New("token Google tidak valid")
	}
	return nil, errors.New("Google client ID belum dikonfigurasi")
}

func googleAudiences() []string {
	raw := []string{
		os.Getenv("GOOGLE_CLIENT_ID_WEB"),
		os.Getenv("GOOGLE_CLIENT_ID_IOS"),
		os.Getenv("GOOGLE_CLIENT_ID_ANDROID"),
	}
	out := make([]string, 0, len(raw))
	seen := map[string]struct{}{}
	for _, item := range raw {
		item = strings.TrimSpace(item)
		if item == "" {
			continue
		}
		if _, exists := seen[item]; exists {
			continue
		}
		seen[item] = struct{}{}
		out = append(out, item)
	}
	return out
}

func (s *Service) sendVerificationEmail(ctx context.Context, account *Account) error {
	if account == nil {
		return fmt.Errorf("akun tidak ditemukan")
	}
	if account.EmailVerifiedAt != nil {
		return nil
	}

	email := strings.ToLower(strings.TrimSpace(account.Email))
	if email == "" {
		return fmt.Errorf("email akun belum tersedia")
	}

	token := uuid.NewString()
	if err := s.storeEmailAction(ctx, accountEmailActionVerify, token, map[string]any{
		"account_id": account.ID.String(),
		"email":      email,
	}); err != nil {
		return fmt.Errorf("kami belum bisa menyiapkan verifikasi email saat ini")
	}

	verifyURL := accountEmailVerifyURL(token)
	html := fmt.Sprintf(
		"<p>Halo %s,</p><p>Klik tombol berikut untuk mengaktifkan akun Bookinaja kamu.</p><p><a href=\"%s\">Verifikasi email</a></p><p>Link ini berlaku 30 menit.</p>",
		safeAccountHTML(account.Name),
		verifyURL,
	)
	text := fmt.Sprintf(
		"Halo %s,\n\nBuka link ini untuk verifikasi email akun Bookinaja kamu (berlaku 30 menit):\n%s",
		account.Name,
		verifyURL,
	)

	return s.sendAccountAuthEmail(ctx, email, "Verifikasi email Bookinaja", html, text, "account_verify_email", "account_verify_email")
}

func (s *Service) storeEmailAction(ctx context.Context, action, token string, payload map[string]any) error {
	if s.redis == nil {
		return fmt.Errorf("verifikasi email sedang mengalami kendala")
	}

	raw, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("payload verifikasi email tidak valid")
	}
	key := accountEmailActionRedisKey(action, token)
	if err := s.redis.Set(ctx, key, raw, accountEmailActionTTL).Err(); err != nil {
		return fmt.Errorf("verifikasi email sedang mengalami kendala")
	}
	return nil
}

func (s *Service) consumeEmailAction(ctx context.Context, action, token string) (map[string]any, error) {
	if s.redis == nil {
		return nil, fmt.Errorf("verifikasi email sedang mengalami kendala")
	}

	key := accountEmailActionRedisKey(action, token)
	var raw string
	err := s.redis.Watch(ctx, func(tx *redis.Tx) error {
		value, err := tx.Get(ctx, key).Result()
		if err != nil {
			return err
		}
		_, err = tx.TxPipelined(ctx, func(pipe redis.Pipeliner) error {
			pipe.Del(ctx, key)
			return nil
		})
		if err != nil {
			return err
		}
		raw = value
		return nil
	}, key)
	if err == redis.Nil || errors.Is(err, redis.TxFailedErr) {
		return nil, fmt.Errorf("link sudah kedaluwarsa atau tidak valid")
	}
	if err != nil {
		return nil, fmt.Errorf("verifikasi email sedang mengalami kendala")
	}

	var payload map[string]any
	if err := json.Unmarshal([]byte(raw), &payload); err != nil {
		return nil, fmt.Errorf("payload email tidak valid")
	}
	return payload, nil
}

func (s *Service) sendAccountAuthEmail(ctx context.Context, to, subject, html, text, eventKey, templateKey string) error {
	if s.mailer == nil || !s.mailer.Enabled() {
		return fmt.Errorf("layanan email belum dikonfigurasi")
	}

	req := mailer.SendRequest{
		To:      []string{strings.TrimSpace(to)},
		Subject: strings.TrimSpace(subject),
		HTML:    strings.TrimSpace(html),
		Text:    strings.TrimSpace(text),
		Tags: map[string]string{
			"source":       "account_auth",
			"event_key":    strings.TrimSpace(eventKey),
			"template_key": strings.TrimSpace(templateKey),
		},
	}

	var logID string
	var err error
	if s.emailAudit != nil {
		logID, err = s.emailAudit.CreateEmailLog(ctx, platformadmin.CreateEmailLogInput{
			Provider:       "resend",
			Source:         "account_auth",
			EventKey:       eventKey,
			TemplateKey:    templateKey,
			Recipient:      strings.TrimSpace(to),
			Subject:        strings.TrimSpace(subject),
			Status:         "queued",
			RequestPayload: req,
			Tags:           req.Tags,
		})
		if err != nil {
			return fmt.Errorf("gagal mencatat log email")
		}
	}

	resp, err := s.mailer.Send(ctx, req)
	if err != nil {
		if s.emailAudit != nil && logID != "" {
			_ = s.emailAudit.UpdateEmailLogDispatch(ctx, logID, "", "failed", err.Error())
		}
		return fmt.Errorf("email verifikasi belum berhasil dikirim")
	}
	if s.emailAudit != nil && logID != "" {
		_ = s.emailAudit.UpdateEmailLogDispatch(ctx, logID, resp.ID, "accepted", "")
	}
	return nil
}

func defaultAccountNameFromEmail(email string) string {
	local := strings.TrimSpace(strings.Split(strings.ToLower(email), "@")[0])
	if local == "" {
		return "Owner"
	}

	parts := strings.FieldsFunc(local, func(r rune) bool {
		return r == '.' || r == '_' || r == '-' || r == '+'
	})
	if len(parts) == 0 {
		return "Owner"
	}

	words := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		words = append(words, strings.ToUpper(part[:1])+part[1:])
	}
	if len(words) == 0 {
		return "Owner"
	}
	return strings.Join(words, " ")
}

func accountEmailActionRedisKey(action, token string) string {
	return fmt.Sprintf("account:email:%s:%s", strings.TrimSpace(action), strings.TrimSpace(token))
}

func accountEmailVerifyURL(token string) string {
	return platformenv.PlatformURL("/verify-email?token=" + url.QueryEscape(strings.TrimSpace(token)))
}

func safeAccountHTML(value string) string {
	value = strings.TrimSpace(value)
	value = strings.ReplaceAll(value, "&", "&amp;")
	value = strings.ReplaceAll(value, "<", "&lt;")
	value = strings.ReplaceAll(value, ">", "&gt;")
	value = strings.ReplaceAll(value, "\"", "&quot;")
	return value
}

func (s *Service) CreateWorkspace(ctx context.Context, accountID uuid.UUID, req CreateWorkspaceReq) (*CreateWorkspaceResponse, error) {
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return nil, errors.New("nama workspace wajib diisi")
	}

	slug := normalizeSlug(req.Slug)
	if slug == "" {
		slug = normalizeSlug(name)
	}
	if slug == "" {
		return nil, errors.New("slug workspace tidak valid")
	}

	category := strings.TrimSpace(req.BusinessCategory)
	if category == "" {
		category = "gaming_hub"
	}

	var referredBy *uuid.UUID
	if referralCode := strings.TrimSpace(req.ReferralCode); referralCode != "" {
		referrerTenantID, err := s.repo.GetTenantIDByReferralCode(ctx, referralCode)
		if err != nil {
			return nil, err
		}
		if referrerTenantID == nil {
			return nil, errors.New("kode referral tidak valid")
		}
		referredBy = referrerTenantID
	}

	workspace := Workspace{
		ID:                 uuid.New(),
		TenantID:           uuid.Nil,
		OwnerUserID:        uuid.Nil,
		Name:               name,
		Slug:               slug,
		BusinessCategory:   category,
		BusinessType:       "",
		Status:             "onboarding",
		Plan:               "trial",
		SubscriptionStatus: "trial",
		Timezone:           "Asia/Jakarta",
		WhatsappNumber:     "",
		ReferredByTenantID: referredBy,
	}

	createdWorkspace, membership, state, err := s.repo.CreateWorkspaceWithOwner(ctx, workspace, accountID)
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "duplicate") || strings.Contains(strings.ToLower(err.Error()), "unique") {
			return nil, fmt.Errorf("slug workspace sudah dipakai")
		}
		return nil, err
	}

	return &CreateWorkspaceResponse{
		Workspace:       *createdWorkspace,
		Membership:      *membership,
		OnboardingState: *state,
	}, nil
}

func (s *Service) GetOnboarding(ctx context.Context, accountID, workspaceID uuid.UUID) (*OnboardingState, error) {
	if err := s.ensureWorkspaceAccess(ctx, accountID, workspaceID); err != nil {
		return nil, err
	}
	state, err := s.repo.GetOnboardingState(ctx, workspaceID)
	if err != nil {
		return nil, err
	}
	if state == nil {
		return nil, errors.New("onboarding workspace tidak ditemukan")
	}
	seed, err := s.repo.GetOnboardingSeed(ctx, workspaceID)
	if err != nil {
		return nil, err
	}
	state.Seed = seed
	return state, nil
}

func (s *Service) UpdateOnboardingStep(ctx context.Context, accountID, workspaceID uuid.UUID, stepKey string, req OnboardingStepUpdateReq) (*OnboardingState, error) {
	if err := s.ensureWorkspaceAccess(ctx, accountID, workspaceID); err != nil {
		return nil, err
	}

	stepKey = strings.TrimSpace(stepKey)
	if !validOnboardingStep(stepKey) {
		return nil, errors.New("step onboarding tidak valid")
	}

	nextStep := strings.TrimSpace(req.NextStep)
	if nextStep == "" {
		nextStep = nextOnboardingStep(stepKey)
	}
	if !validOnboardingStep(nextStep) {
		return nil, errors.New("next step onboarding tidak valid")
	}

	complete := req.Complete || stepKey == "done"
	if complete {
		nextStep = "done"
	}

	if stepKey == "resource" {
		if err := s.repo.CreateOnboardingResource(
			ctx,
			workspaceID,
			req.ResourceName,
			req.ResourceCategory,
			req.ResourceDesc,
			req.ResourceImageURL,
			req.PriceName,
			req.Price,
			req.PriceUnit,
			req.UnitDuration,
		); err != nil {
			return nil, err
		}
	}
	if stepKey == "business" {
		if err := s.repo.UpdateOnboardingBusinessBasics(
			ctx,
			workspaceID,
			req.OpenTime,
			req.CloseTime,
			req.WhatsappNumber,
		); err != nil {
			return nil, err
		}
	}
	if stepKey == "payments" {
		if err := s.repo.ConfigureOnboardingPaymentMethods(ctx, workspaceID, req.PaymentMethods); err != nil {
			return nil, err
		}
	}
	if stepKey == "first-booking" {
		if err := s.repo.CreateOnboardingFirstBooking(ctx, workspaceID, req.FirstBooking); err != nil {
			return nil, err
		}
	}

	state, err := s.repo.UpdateOnboardingState(ctx, workspaceID, stepKey, nextStep, strings.TrimSpace(req.SelectedStartMode), complete)
	if err != nil {
		return nil, err
	}
	_ = s.repo.InsertOnboardingEvent(ctx, workspaceID, accountID, "onboarding_step_completed", stepKey)
	return state, nil
}

func (s *Service) GetWorkspaceTenantIDForUpload(ctx context.Context, accountID, workspaceID uuid.UUID) (uuid.UUID, error) {
	return s.repo.GetWorkspaceTenantIDForAccount(ctx, accountID, workspaceID)
}

func (s *Service) ensureWorkspaceAccess(ctx context.Context, accountID, workspaceID uuid.UUID) error {
	ok, err := s.repo.AccountCanAccessWorkspace(ctx, accountID, workspaceID)
	if err != nil {
		return err
	}
	if !ok {
		return sql.ErrNoRows
	}
	return nil
}

func normalizeSlug(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	var builder strings.Builder
	lastDash := false
	for _, r := range value {
		if r >= 'a' && r <= 'z' || r >= '0' && r <= '9' {
			builder.WriteRune(r)
			lastDash = false
			continue
		}
		if (r == '-' || r == '_' || r == ' ') && !lastDash && builder.Len() > 0 {
			builder.WriteRune('-')
			lastDash = true
		}
	}
	return strings.Trim(builder.String(), "-")
}

func validOnboardingStep(value string) bool {
	for _, step := range onboardingSteps {
		if value == step {
			return true
		}
	}
	return false
}

func nextOnboardingStep(current string) string {
	for index, step := range onboardingSteps {
		if step == current {
			if index+1 < len(onboardingSteps) {
				return onboardingSteps[index+1]
			}
			return "done"
		}
	}
	return "workspace"
}
