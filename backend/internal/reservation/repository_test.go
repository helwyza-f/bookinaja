package reservation

import (
	"context"
	"regexp"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

func TestInitialPromoRedemptionStatus(t *testing.T) {
	if got := initialPromoRedemptionStatus(Booking{Status: "pending"}); got != "reserved" {
		t.Fatalf("initialPromoRedemptionStatus(pending) = %s, want reserved", got)
	}
	if got := initialPromoRedemptionStatus(Booking{Status: "active"}); got != "redeemed" {
		t.Fatalf("initialPromoRedemptionStatus(active) = %s, want redeemed", got)
	}
}

func TestPromoRedemptionStatusForBooking(t *testing.T) {
	tests := []struct {
		status string
		want   string
		ok     bool
	}{
		{status: "active", want: "redeemed", ok: true},
		{status: "completed", want: "redeemed", ok: true},
		{status: "cancelled", want: "released", ok: true},
		{status: "confirmed", want: "", ok: false},
	}

	for _, tt := range tests {
		got, ok := promoRedemptionStatusForBooking(tt.status)
		if ok != tt.ok || got != tt.want {
			t.Fatalf("promoRedemptionStatusForBooking(%s) = (%s, %v), want (%s, %v)", tt.status, got, ok, tt.want, tt.ok)
		}
	}
}

func TestUpdatePromoRedemptionStatusCastsStatusParameter(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New() error = %v", err)
	}
	t.Cleanup(func() {
		_ = db.Close()
	})

	repo := NewRepository(sqlx.NewDb(db, "sqlmock"))
	bookingID := uuid.New()

	mock.ExpectExec(regexp.QuoteMeta(`
		UPDATE tenant_promo_redemptions
		SET status = $2::varchar(20),
			redeemed_at = CASE
				WHEN $2::varchar(20) = 'redeemed' THEN COALESCE(redeemed_at, NOW())
				ELSE redeemed_at
			END
		WHERE booking_id = $1`)).
		WithArgs(bookingID, "released").
		WillReturnResult(sqlmock.NewResult(0, 1))

	if err := repo.updatePromoRedemptionStatus(context.Background(), repo.db, bookingID, "released"); err != nil {
		t.Fatalf("updatePromoRedemptionStatus() error = %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("ExpectationsWereMet() error = %v", err)
	}
}

func TestCreateWithItemsCastsPromoRedemptionStatusParameter(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New() error = %v", err)
	}
	t.Cleanup(func() {
		_ = db.Close()
	})

	repo := NewRepository(sqlx.NewDb(db, "sqlmock"))
	bookingID := uuid.New()
	tenantID := uuid.New()
	customerID := uuid.New()
	promoID := uuid.New()
	resourceID := uuid.New()

	mock.ExpectBegin()
	mock.ExpectExec(`INSERT INTO bookings`).
		WillReturnResult(sqlmock.NewResult(1, 1))
		mock.ExpectExec(regexp.QuoteMeta(`
				INSERT INTO tenant_promo_redemptions (
					id, promo_id, tenant_id, booking_id, customer_id, promo_code, discount_amount,
					original_amount, final_amount, snapshot, status, redeemed_at, created_at
				) VALUES (
					$1, $2, $3, $4, $5, $6, $7,
					$8, $9, $10, $11::varchar(20),
					NOW(),
					NOW()
				)`)).
		WithArgs(
			sqlmock.AnyArg(),
			promoID,
			tenantID,
			bookingID,
			customerID,
			"PROMO10",
			1000.0,
			10000.0,
			9000.0,
			sqlmock.AnyArg(),
			"reserved",
		).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectExec(regexp.QuoteMeta(`
		INSERT INTO booking_events (
			id, booking_id, tenant_id, customer_id, actor_user_id, actor_type, actor_name, actor_email, actor_role, event_type, title, description, metadata, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW()
		)`)).
		WithArgs(
			sqlmock.AnyArg(),
			bookingID,
			tenantID,
			&customerID,
			nil,
			"customer",
			"",
			"",
			"",
			"booking.created",
			"Booking dibuat",
			"Booking tercatat dan menunggu pembayaran DP.",
			sqlmock.AnyArg(),
		).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	err = repo.CreateWithItems(context.Background(), Booking{
		ID:              bookingID,
		TenantID:        tenantID,
		CustomerID:      customerID,
		ResourceID:      resourceID,
		AccessToken:     uuid.New(),
		Status:          "pending",
		PromoID:         &promoID,
		GrandTotal:      9000,
		DepositAmount:   2000,
		PaidAmount:      0,
		BalanceDue:      9000,
		PaymentStatus:   "pending",
		PaymentMethod:   "midtrans",
		DiscountAmount:  1000,
		OriginalGrandTotal: func() *float64 {
			v := 10000.0
			return &v
		}(),
		CreatedAt: time.Now().UTC(),
	}, nil, 1, &PromoRedemptionInput{
		PromoID:         promoID,
		CustomerID:      customerID,
		PromoCode:       "PROMO10",
		DiscountAmount:  1000,
		OriginalAmount:  10000,
		FinalAmount:     9000,
		SnapshotPayload: []byte(`{"code":"PROMO10"}`),
	})
	if err != nil {
		t.Fatalf("CreateWithItems() error = %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("ExpectationsWereMet() error = %v", err)
	}
}
