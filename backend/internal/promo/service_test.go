package promo

import (
	"context"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

func TestValidateApplyReasonCodes(t *testing.T) {
	now := time.Now().UTC()
	tenantID := uuid.New()
	resourceID := uuid.New()
	customerID := uuid.New()
	minAmount := int64(100000)
	maxDiscount := int64(20000)

	makeInput := func() ApplyInput {
		return ApplyInput{
			TenantID:   tenantID,
			ResourceID: resourceID,
			StartTime:  now,
			EndTime:    now.Add(time.Hour),
			Subtotal:   150000,
			CustomerID: &customerID,
			Code:       "PROMO10",
		}
	}

	makePromo := func() *Promo {
		return &Promo{
			ID:                uuid.New(),
			TenantID:          tenantID,
			Code:              "PROMO10",
			Name:              "Promo Test",
			DiscountType:      "percentage",
			DiscountValue:     10,
			MaxDiscountAmount: &maxDiscount,
			IsActive:          true,
		}
	}

	tests := []struct {
		name     string
		mutate   func(*Promo, *ApplyInput)
		wantCode string
	}{
		{
			name: "inactive",
			mutate: func(p *Promo, _ *ApplyInput) {
				p.IsActive = false
			},
			wantCode: "PROMO_INACTIVE",
		},
		{
			name: "not started",
			mutate: func(p *Promo, _ *ApplyInput) {
				startsAt := now.Add(time.Hour)
				p.StartsAt = &startsAt
			},
			wantCode: "PROMO_NOT_STARTED",
		},
		{
			name: "expired",
			mutate: func(p *Promo, _ *ApplyInput) {
				endsAt := now.Add(-time.Hour)
				p.EndsAt = &endsAt
			},
			wantCode: "PROMO_EXPIRED",
		},
		{
			name: "minimum booking not met",
			mutate: func(p *Promo, input *ApplyInput) {
				p.MinBookingAmount = &minAmount
				input.Subtotal = 50000
			},
			wantCode: "MIN_BOOKING_NOT_MET",
		},
		{
			name: "weekday not eligible",
			mutate: func(p *Promo, input *ApplyInput) {
				p.ValidWeekdays = IntArray{1}
				input.StartTime = time.Date(2026, time.May, 9, 13, 0, 0, 0, time.UTC) // Saturday
			},
			wantCode: "WEEKDAY_NOT_ELIGIBLE",
		},
		{
			name: "time not eligible",
			mutate: func(p *Promo, input *ApplyInput) {
				start := "10:00:00"
				end := "16:00:00"
				p.TimeStart = &start
				p.TimeEnd = &end
				input.StartTime = time.Date(2026, time.May, 6, 18, 0, 0, 0, time.UTC)
			},
			wantCode: "TIME_NOT_ELIGIBLE",
		},
		{
			name: "resource not eligible",
			mutate: func(p *Promo, input *ApplyInput) {
				p.ResourceIDs = []uuid.UUID{uuid.New()}
				input.ResourceID = resourceID
			},
			wantCode: "RESOURCE_NOT_ELIGIBLE",
		},
	}

	svc := NewService(nil)
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			promo := makePromo()
			input := makeInput()
			tt.mutate(promo, &input)

			err := svc.validateApply(context.Background(), promo, input)
			if err == nil {
				t.Fatalf("validateApply() error = nil, want %s", tt.wantCode)
			}
			invalid, ok := err.(*InvalidPromoError)
			if !ok {
				t.Fatalf("validateApply() error type = %T, want *InvalidPromoError", err)
			}
			if invalid.Code != tt.wantCode {
				t.Fatalf("validateApply() code = %s, want %s", invalid.Code, tt.wantCode)
			}
		})
	}
}

func TestValidateApplyUsageLimitReached(t *testing.T) {
	svc, mock, cleanup := newPromoTestService(t)
	defer cleanup()

	promoID := uuid.New()
	limit := 1
	promo := &Promo{
		ID:              promoID,
		Code:            "LIMIT1",
		Name:            "Limit 1",
		DiscountType:    "fixed",
		DiscountValue:   10000,
		IsActive:        true,
		UsageLimitTotal: &limit,
	}

	mock.ExpectQuery(`SELECT COUNT\(\*\) FROM tenant_promo_redemptions`).
		WithArgs(promoID).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))

	err := svc.validateApply(context.Background(), promo, ApplyInput{
		ResourceID: uuid.New(),
		StartTime:  time.Now().UTC(),
		EndTime:    time.Now().UTC().Add(time.Hour),
		Subtotal:   120000,
	})
	if err == nil {
		t.Fatal("validateApply() error = nil, want usage limit error")
	}
	invalid, ok := err.(*InvalidPromoError)
	if !ok {
		t.Fatalf("validateApply() error type = %T, want *InvalidPromoError", err)
	}
	if invalid.Code != "USAGE_LIMIT_REACHED" {
		t.Fatalf("validateApply() code = %s, want USAGE_LIMIT_REACHED", invalid.Code)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("sql expectations: %v", err)
	}
}

func TestValidateApplyCustomerLimitReached(t *testing.T) {
	svc, mock, cleanup := newPromoTestService(t)
	defer cleanup()

	promoID := uuid.New()
	customerID := uuid.New()
	limit := 2
	promo := &Promo{
		ID:                    promoID,
		Code:                  "CUSTOMER2",
		Name:                  "Customer 2",
		DiscountType:          "fixed",
		DiscountValue:         10000,
		IsActive:              true,
		UsageLimitPerCustomer: &limit,
	}

	mock.ExpectQuery(`SELECT COUNT\(\*\) FROM tenant_promo_redemptions`).
		WithArgs(promoID, customerID).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(2))

	err := svc.validateApply(context.Background(), promo, ApplyInput{
		ResourceID: uuid.New(),
		StartTime:  time.Now().UTC(),
		EndTime:    time.Now().UTC().Add(time.Hour),
		Subtotal:   120000,
		CustomerID: &customerID,
	})
	if err == nil {
		t.Fatal("validateApply() error = nil, want customer limit error")
	}
	invalid, ok := err.(*InvalidPromoError)
	if !ok {
		t.Fatalf("validateApply() error type = %T, want *InvalidPromoError", err)
	}
	if invalid.Code != "CUSTOMER_LIMIT_REACHED" {
		t.Fatalf("validateApply() code = %s, want CUSTOMER_LIMIT_REACHED", invalid.Code)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("sql expectations: %v", err)
	}
}

func TestValidateApplyUsesLocalStartForWeekdayAndTimeChecks(t *testing.T) {
	wib := time.FixedZone("WIB", 7*60*60)
	startRule := "08:00:00"
	endRule := "10:00:00"
	promo := &Promo{
		ID:            uuid.New(),
		Code:          "MORNING",
		Name:          "Morning Promo",
		DiscountType:  "fixed",
		DiscountValue: 10000,
		IsActive:      true,
		ValidWeekdays: IntArray{6},
		TimeStart:     &startRule,
		TimeEnd:       &endRule,
	}

	input := ApplyInput{
		ResourceID: uuid.New(),
		StartTime:  time.Date(2026, time.May, 9, 1, 30, 0, 0, time.UTC),
		LocalStart: time.Date(2026, time.May, 9, 8, 30, 0, 0, wib),
		EndTime:    time.Date(2026, time.May, 9, 2, 30, 0, 0, time.UTC),
		Subtotal:   120000,
	}

	if err := NewService(nil).validateApply(context.Background(), promo, input); err != nil {
		t.Fatalf("validateApply() error = %v, want nil", err)
	}
}

func TestValidateApplyUsesTenantTimezoneByDefault(t *testing.T) {
	svc, mock, cleanup := newPromoTestService(t)
	defer cleanup()

	tenantID := uuid.New()
	startRule := "08:00:00"
	endRule := "10:00:00"
	promo := &Promo{
		ID:            uuid.New(),
		TenantID:      tenantID,
		Code:          "MORNING",
		Name:          "Morning Promo",
		DiscountType:  "fixed",
		DiscountValue: 10000,
		IsActive:      true,
		ValidWeekdays: IntArray{6},
		TimeStart:     &startRule,
		TimeEnd:       &endRule,
	}

	mock.ExpectQuery(`SELECT COALESCE\(NULLIF\(BTRIM\(timezone\), ''\), 'Asia/Jakarta'\)`).
		WithArgs(tenantID).
		WillReturnRows(sqlmock.NewRows([]string{"timezone"}).AddRow("Asia/Jakarta"))

	input := ApplyInput{
		TenantID:   tenantID,
		ResourceID: uuid.New(),
		StartTime:  time.Date(2026, time.May, 9, 1, 30, 0, 0, time.UTC),
		EndTime:    time.Date(2026, time.May, 9, 2, 30, 0, 0, time.UTC),
		Subtotal:   120000,
	}

	if err := svc.validateApply(context.Background(), promo, input); err != nil {
		t.Fatalf("validateApply() error = %v, want nil", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("sql expectations: %v", err)
	}
}

func TestCalculateDiscountRespectsMaximumAndOriginalAmount(t *testing.T) {
	maxDiscount := int64(20000)
	promo := &Promo{
		DiscountType:      "percentage",
		DiscountValue:     50,
		MaxDiscountAmount: &maxDiscount,
	}

	if got := calculateDiscount(promo, 100000); got != 20000 {
		t.Fatalf("calculateDiscount() = %f, want 20000", got)
	}

	promo = &Promo{
		DiscountType:  "fixed",
		DiscountValue: 50000,
	}
	if got := calculateDiscount(promo, 12000); got != 12000 {
		t.Fatalf("calculateDiscount() = %f, want 12000", got)
	}
}

func newPromoTestService(t *testing.T) (*Service, sqlmock.Sqlmock, func()) {
	t.Helper()

	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New() error = %v", err)
	}

	sqlxDB := sqlx.NewDb(db, "sqlmock")
	repo := NewRepository(sqlxDB)
	svc := NewService(repo)

	cleanup := func() {
		_ = db.Close()
	}
	return svc, mock, cleanup
}
