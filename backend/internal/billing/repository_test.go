package billing

import (
	"context"
	"regexp"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

func TestApplyManualDepositPaymentRedeemsPromo(t *testing.T) {
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
		UPDATE bookings
		SET payment_status = CASE
				WHEN deposit_amount > 0 THEN 'partial_paid'
				ELSE 'paid'
			END,
			status = CASE
				WHEN status = 'pending' THEN 'confirmed'
				ELSE status
			END,
			payment_method = $2,
			paid_amount = GREATEST(paid_amount, deposit_amount),
			balance_due = GREATEST(grand_total - GREATEST(paid_amount, deposit_amount), 0),
			last_status_changed_at = CASE
				WHEN status = 'pending' THEN NOW()
				ELSE last_status_changed_at
			END
		WHERE id = $1`)).
		WithArgs(bookingID, "bank_transfer").
		WillReturnResult(sqlmock.NewResult(0, 1))

	mock.ExpectExec(regexp.QuoteMeta(`
		UPDATE tenant_promo_redemptions
		SET status = $2::varchar(20),
			redeemed_at = CASE
				WHEN $2::varchar(20) = 'redeemed' THEN COALESCE(redeemed_at, NOW())
				ELSE redeemed_at
			END
		WHERE booking_id = $1`)).
		WithArgs(bookingID, "redeemed").
		WillReturnResult(sqlmock.NewResult(0, 1))

	if err := repo.ApplyManualDepositPayment(context.Background(), repo.db, bookingID, "bank_transfer"); err != nil {
		t.Fatalf("ApplyManualDepositPayment() error = %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("ExpectationsWereMet() error = %v", err)
	}
}
