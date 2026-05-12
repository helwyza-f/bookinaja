package customer

import (
	"context"
	"database/sql"
	"strings"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/alicebob/miniredis/v2"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
	"github.com/redis/go-redis/v9"
)

func TestLoginWithGoogleReturnsAuthenticatedForLinkedAccount(t *testing.T) {
	svc, mock, cleanup := newCustomerTestService(t, false)
	defer cleanup()

	linked := testCustomer()
	subject := "google-linked"
	linked.GoogleSubject = &subject

	svc.verifyGoogleIdentityFn = func(context.Context, string) (*googleIdentity, error) {
		return &googleIdentity{Subject: subject, Name: linked.Name}, nil
	}

	mock.ExpectQuery(`SELECT \* FROM customers WHERE google_subject = \$1 LIMIT 1`).
		WithArgs(subject).
		WillReturnRows(customerRows(linked))
	mock.ExpectExec(`UPDATE customers\s+SET last_login_method = \$2,`).
		WithArgs(linked.ID, "google").
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectQuery(`(?s)SELECT.*FROM customers c.*WHERE c.id = \$1.*LIMIT 1`).
		WithArgs(linked.ID).
		WillReturnRows(customerRows(linked))

	result, err := svc.LoginWithGoogle(context.Background(), "token")
	if err != nil {
		t.Fatalf("LoginWithGoogle() error = %v", err)
	}
	if result.Status != "authenticated" {
		t.Fatalf("LoginWithGoogle() status = %s, want authenticated", result.Status)
	}
	if result.Customer == nil || result.Customer.ID != linked.ID {
		t.Fatalf("LoginWithGoogle() customer = %#v, want id %s", result.Customer, linked.ID)
	}

	assertCustomerMock(t, mock)
}

func TestLoginWithGoogleLinksExistingEmail(t *testing.T) {
	svc, mock, cleanup := newCustomerTestService(t, false)
	defer cleanup()

	existing := testCustomer()
	email := "linked@example.com"
	subject := "google-email-link"
	existing.Email = &email

	linked := existing
	linked.GoogleSubject = &subject

	svc.verifyGoogleIdentityFn = func(context.Context, string) (*googleIdentity, error) {
		return &googleIdentity{
			Subject:       subject,
			Email:         &email,
			Name:          existing.Name,
			EmailVerified: true,
		}, nil
	}

	mock.ExpectQuery(`SELECT \* FROM customers WHERE google_subject = \$1 LIMIT 1`).
		WithArgs(subject).
		WillReturnError(sql.ErrNoRows)
	mock.ExpectQuery(`SELECT \* FROM customers WHERE LOWER\(email\) = LOWER\(\$1\) LIMIT 1`).
		WithArgs(email).
		WillReturnRows(customerRows(existing))
	mock.ExpectQuery(`(?s)UPDATE customers\s+SET google_subject = \$1,.*WHERE id = \$6.*RETURNING \*`).
		WithArgs(subject, &email, &existing.Name, (*string)(nil), true, existing.ID).
		WillReturnRows(customerRows(linked))
	mock.ExpectExec(`UPDATE customers\s+SET last_login_method = \$2,`).
		WithArgs(existing.ID, "google").
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectQuery(`(?s)SELECT.*FROM customers c.*WHERE c.id = \$1.*LIMIT 1`).
		WithArgs(existing.ID).
		WillReturnRows(customerRows(linked))

	result, err := svc.LoginWithGoogle(context.Background(), "token")
	if err != nil {
		t.Fatalf("LoginWithGoogle() error = %v", err)
	}
	if result.Status != "authenticated" {
		t.Fatalf("LoginWithGoogle() status = %s, want authenticated", result.Status)
	}
	if result.Message != "Akun Google berhasil dihubungkan." {
		t.Fatalf("LoginWithGoogle() message = %q", result.Message)
	}

	assertCustomerMock(t, mock)
}

func TestLoginWithGoogleDoesNotLinkExistingEmailWhenClaimUnverified(t *testing.T) {
	svc, mock, cleanup := newCustomerTestService(t, true)
	defer cleanup()

	existing := testCustomer()
	email := "linked@example.com"
	existing.Email = &email

	svc.verifyGoogleIdentityFn = func(context.Context, string) (*googleIdentity, error) {
		return &googleIdentity{
			Subject:       "google-unverified-email",
			Email:         &email,
			Name:          existing.Name,
			EmailVerified: false,
		}, nil
	}

	mock.ExpectQuery(`SELECT \* FROM customers WHERE google_subject = \$1 LIMIT 1`).
		WithArgs("google-unverified-email").
		WillReturnError(sql.ErrNoRows)
	mock.ExpectQuery(`SELECT \* FROM customers WHERE LOWER\(email\) = LOWER\(\$1\) LIMIT 1`).
		WithArgs(email).
		WillReturnRows(customerRows(existing))

	result, err := svc.LoginWithGoogle(context.Background(), "token")
	if err != nil {
		t.Fatalf("LoginWithGoogle() error = %v", err)
	}
	if result.Status != "needs_phone" {
		t.Fatalf("LoginWithGoogle() status = %s, want needs_phone", result.Status)
	}
	if strings.TrimSpace(result.ClaimToken) == "" {
		t.Fatal("LoginWithGoogle() claim token is empty")
	}

	assertCustomerMock(t, mock)
}

func TestLoginWithGoogleReturnsNeedsPhoneForNewAccount(t *testing.T) {
	svc, mock, cleanup := newCustomerTestService(t, true)
	defer cleanup()

	email := "new@example.com"
	svc.verifyGoogleIdentityFn = func(context.Context, string) (*googleIdentity, error) {
		return &googleIdentity{
			Subject: "google-new",
			Email:   &email,
			Name:    "New Customer",
		}, nil
	}

	mock.ExpectQuery(`SELECT \* FROM customers WHERE google_subject = \$1 LIMIT 1`).
		WithArgs("google-new").
		WillReturnError(sql.ErrNoRows)
	mock.ExpectQuery(`SELECT \* FROM customers WHERE LOWER\(email\) = LOWER\(\$1\) LIMIT 1`).
		WithArgs(email).
		WillReturnError(sql.ErrNoRows)

	result, err := svc.LoginWithGoogle(context.Background(), "token")
	if err != nil {
		t.Fatalf("LoginWithGoogle() error = %v", err)
	}
	if result.Status != "needs_phone" {
		t.Fatalf("LoginWithGoogle() status = %s, want needs_phone", result.Status)
	}
	if strings.TrimSpace(result.ClaimToken) == "" {
		t.Fatal("LoginWithGoogle() claim token is empty")
	}
	if ttl := svc.redis.TTL(context.Background(), googleClaimRedisKey(result.ClaimToken)).Val(); ttl <= 0 {
		t.Fatalf("google claim TTL = %v, want > 0", ttl)
	}

	assertCustomerMock(t, mock)
}

func TestClaimGoogleAccountRejectsExpiredToken(t *testing.T) {
	svc, _, cleanup := newCustomerTestService(t, true)
	defer cleanup()

	_, err := svc.ClaimGoogleAccount(context.Background(), GoogleClaimReq{
		ClaimToken: "expired-token",
		Phone:      "08123456789",
	})
	if err == nil {
		t.Fatal("ClaimGoogleAccount() error = nil, want expired token error")
	}
	if err.Error() != "claim akun Google sudah kedaluwarsa. Silakan login Google lagi" {
		t.Fatalf("ClaimGoogleAccount() error = %q", err.Error())
	}
}

func TestClaimGoogleAccountRejectsVerifiedPhoneOwnership(t *testing.T) {
	svc, mock, cleanup := newCustomerTestService(t, true)
	defer cleanup()

	if err := svc.storeGoogleClaim(context.Background(), "claim-token", &googleIdentity{
		Subject: "google-claim",
		Name:    "Google User",
	}); err != nil {
		t.Fatalf("storeGoogleClaim() error = %v", err)
	}

	existing := testCustomer()

	mock.ExpectQuery(`SELECT \* FROM customers WHERE phone = \$1 LIMIT 1`).
		WithArgs("08123456789").
		WillReturnRows(customerRows(existing))

	_, err := svc.ClaimGoogleAccount(context.Background(), GoogleClaimReq{
		ClaimToken: "claim-token",
		Phone:      "0812 3456 789",
		Name:       "Google User",
	})
	if err == nil {
		t.Fatal("ClaimGoogleAccount() error = nil, want phone conflict")
	}
	if err.Error() != "nomor WhatsApp ini sudah terdaftar. Masuk dulu lalu hubungkan Google dari akun yang sama" {
		t.Fatalf("ClaimGoogleAccount() error = %q", err.Error())
	}

	assertCustomerMock(t, mock)
}

func TestClaimGoogleAccountExplainsGoogleSubjectConflict(t *testing.T) {
	svc, mock, cleanup := newCustomerTestService(t, true)
	defer cleanup()

	email := "new@example.com"
	if err := svc.storeGoogleClaim(context.Background(), "claim-token", &googleIdentity{
		Subject: "google-conflict",
		Email:   &email,
		Name:    "Google User",
	}); err != nil {
		t.Fatalf("storeGoogleClaim() error = %v", err)
	}

	mock.ExpectQuery(`SELECT \* FROM customers WHERE phone = \$1 LIMIT 1`).
		WithArgs("08123456789").
		WillReturnError(sql.ErrNoRows)
	mock.ExpectQuery(`(?s)INSERT INTO customers .*RETURNING id`).
		WillReturnError(&pq.Error{Code: "23505", Constraint: "uniq_customers_google_subject"})

	_, err := svc.ClaimGoogleAccount(context.Background(), GoogleClaimReq{
		ClaimToken: "claim-token",
		Phone:      "08123456789",
		Name:       "Google User",
	})
	if err == nil {
		t.Fatal("ClaimGoogleAccount() error = nil, want google subject conflict")
	}
	if err.Error() != "akun Google ini sudah pernah terhubung ke akun Bookinaja lain. Coba login Google lagi atau masuk ke akun yang sudah terhubung" {
		t.Fatalf("ClaimGoogleAccount() error = %q", err.Error())
	}

	assertCustomerMock(t, mock)
}

func TestLinkGoogleForCustomerRejectsAlreadyLinkedSubject(t *testing.T) {
	svc, mock, cleanup := newCustomerTestService(t, false)
	defer cleanup()

	current := testCustomer()
	other := testCustomer()
	other.ID = uuid.New()

	svc.verifyGoogleIdentityFn = func(context.Context, string) (*googleIdentity, error) {
		return &googleIdentity{
			Subject: "google-linked-elsewhere",
			Name:    "Other User",
		}, nil
	}

	mock.ExpectQuery(`(?s)SELECT.*FROM customers c.*WHERE c.id = \$1.*LIMIT 1`).
		WithArgs(current.ID).
		WillReturnRows(customerRows(current))
	mock.ExpectQuery(`SELECT \* FROM customers WHERE google_subject = \$1 LIMIT 1`).
		WithArgs("google-linked-elsewhere").
		WillReturnRows(customerRows(other))

	_, err := svc.LinkGoogleForCustomer(context.Background(), current.ID.String(), "token")
	if err == nil {
		t.Fatal("LinkGoogleForCustomer() error = nil, want google subject conflict")
	}
	if err.Error() != "akun Google ini sudah terhubung ke akun Bookinaja lain" {
		t.Fatalf("LinkGoogleForCustomer() error = %q", err.Error())
	}

	assertCustomerMock(t, mock)
}

func TestRequestPasswordResetEmailDoesNotRevealMissingAccount(t *testing.T) {
	svc, mock, cleanup := newCustomerTestService(t, false)
	defer cleanup()

	mock.ExpectQuery(`SELECT \* FROM customers WHERE LOWER\(email\) = LOWER\(\$1\) LIMIT 1`).
		WithArgs("missing@example.com").
		WillReturnError(sql.ErrNoRows)

	if err := svc.RequestPasswordResetEmail(context.Background(), "missing@example.com"); err != nil {
		t.Fatalf("RequestPasswordResetEmail() error = %v, want nil", err)
	}

	assertCustomerMock(t, mock)
}

func TestRequestPasswordResetEmailDoesNotRevealUnverifiedEmail(t *testing.T) {
	svc, mock, cleanup := newCustomerTestService(t, false)
	defer cleanup()

	customer := testCustomer()
	customer.EmailVerifiedAt = nil

	mock.ExpectQuery(`SELECT \* FROM customers WHERE LOWER\(email\) = LOWER\(\$1\) LIMIT 1`).
		WithArgs(*customer.Email).
		WillReturnRows(customerRows(customer))

	if err := svc.RequestPasswordResetEmail(context.Background(), *customer.Email); err != nil {
		t.Fatalf("RequestPasswordResetEmail() error = %v, want nil", err)
	}

	assertCustomerMock(t, mock)
}

func TestConsumeEmailActionCanOnlyBeUsedOnce(t *testing.T) {
	svc, _, cleanup := newCustomerTestService(t, true)
	defer cleanup()

	if err := svc.storeEmailAction(context.Background(), emailActionVerifyEmail, "verify-once", map[string]any{
		"customer_id": uuid.NewString(),
		"email":       "customer@example.com",
	}); err != nil {
		t.Fatalf("storeEmailAction() error = %v", err)
	}

	payload, err := svc.consumeEmailAction(context.Background(), emailActionVerifyEmail, "verify-once")
	if err != nil {
		t.Fatalf("consumeEmailAction() first call error = %v", err)
	}
	if payload["email"] != "customer@example.com" {
		t.Fatalf("consumeEmailAction() payload = %#v", payload)
	}

	_, err = svc.consumeEmailAction(context.Background(), emailActionVerifyEmail, "verify-once")
	if err == nil {
		t.Fatal("consumeEmailAction() second call error = nil, want invalid link error")
	}
	if err.Error() != "link sudah kedaluwarsa atau tidak valid" {
		t.Fatalf("consumeEmailAction() second call error = %q", err.Error())
	}
}

func newCustomerTestService(t *testing.T, withRedis bool) (*Service, sqlmock.Sqlmock, func()) {
	t.Helper()

	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New() error = %v", err)
	}

	sqlxDB := sqlx.NewDb(db, "sqlmock")
	var (
		redisClient *redis.Client
		mr          *miniredis.Miniredis
	)
	if withRedis {
		mr, err = miniredis.Run()
		if err != nil {
			t.Fatalf("miniredis.Run() error = %v", err)
		}
		redisClient = redis.NewClient(&redis.Options{Addr: mr.Addr()})
	}

	repo := NewRepository(sqlxDB)
	svc := NewService(repo, redisClient)

	cleanup := func() {
		if redisClient != nil {
			_ = redisClient.Close()
		}
		if mr != nil {
			mr.Close()
		}
		_ = db.Close()
	}
	return svc, mock, cleanup
}

func testCustomer() Customer {
	now := time.Now().UTC()
	email := "customer@example.com"
	return Customer{
		ID:                 uuid.New(),
		Name:               "Customer Bookinaja",
		Phone:              "08123456789",
		Email:              &email,
		Tier:               "NEW",
		TotalVisits:        0,
		TotalSpent:         0,
		AccountStatus:      "verified",
		AccountStage:       "active",
		RegistrationSource: "manual",
		PhoneVerifiedAt:    &now,
		CountryCode:        "ID",
		LoyaltyPoints:      0,
		CreatedAt:          now,
		UpdatedAt:          now,
	}
}

func customerRows(c Customer) *sqlmock.Rows {
	return sqlmock.NewRows([]string{
		"id",
		"tenant_id",
		"name",
		"phone",
		"email",
		"password",
		"avatar_url",
		"tier",
		"total_visits",
		"total_spent",
		"last_visit",
		"account_status",
		"account_stage",
		"registration_source",
		"phone_verified_at",
		"google_subject",
		"last_login_method",
		"last_login_at",
		"silent_registered_at",
		"profile_completed_at",
		"marketing_opt_in",
		"birth_date",
		"gender",
		"city",
		"province",
		"country_code",
		"loyalty_points",
		"created_at",
		"updated_at",
	}).AddRow(
		c.ID,
		c.TenantID,
		c.Name,
		c.Phone,
		c.Email,
		c.Password,
		c.AvatarURL,
		c.Tier,
		c.TotalVisits,
		c.TotalSpent,
		c.LastVisit,
		c.AccountStatus,
		c.AccountStage,
		c.RegistrationSource,
		c.PhoneVerifiedAt,
		c.GoogleSubject,
		c.LastLoginMethod,
		c.LastLoginAt,
		c.SilentRegisteredAt,
		c.ProfileCompletedAt,
		c.MarketingOptIn,
		c.BirthDate,
		c.Gender,
		c.City,
		c.Province,
		c.CountryCode,
		c.LoyaltyPoints,
		c.CreatedAt,
		c.UpdatedAt,
	)
}

func assertCustomerMock(t *testing.T, mock sqlmock.Sqlmock) {
	t.Helper()
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("sql expectations: %v", err)
	}
}
