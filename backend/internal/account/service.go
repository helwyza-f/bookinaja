package account

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/helwiza/backend/internal/auth"
	"golang.org/x/crypto/bcrypt"
	"google.golang.org/api/idtoken"
)

type Service struct {
	repo    *Repository
	authSvc *auth.Service
}

var onboardingSteps = []string{
	"workspace",
	"template",
	"resource",
	"business",
	"payments",
	"first-booking",
	"done",
}

func NewService(repo *Repository, authSvc *auth.Service) *Service {
	return &Service{repo: repo, authSvc: authSvc}
}

func (s *Service) Signup(ctx context.Context, req SignupReq) (*AuthResponse, error) {
	name := strings.TrimSpace(req.Name)
	email := strings.ToLower(strings.TrimSpace(req.Email))
	password := strings.TrimSpace(req.Password)

	if name == "" || email == "" || len(password) < 6 {
		return nil, errors.New("nama, email, dan password minimal 6 karakter wajib diisi")
	}

	existing, err := s.repo.GetAccountByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if existing != nil {
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

	token, err := s.authSvc.GenerateAccountToken(account.ID)
	if err != nil {
		return nil, err
	}
	return &AuthResponse{Token: token, Account: *account}, nil
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

	token, err := s.authSvc.GenerateAccountToken(account.ID)
	if err != nil {
		return nil, err
	}
	return &AuthResponse{Token: token, Account: *account}, nil
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
