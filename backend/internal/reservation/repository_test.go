package reservation

import (
	"context"
	"regexp"
	"testing"

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
