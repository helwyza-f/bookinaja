package billing

import (
	"context"
	"io"
	"net/http"
	"regexp"
	"strings"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (fn roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return fn(req)
}

func newBillingTestService(t *testing.T) (*Service, sqlmock.Sqlmock) {
	t.Helper()

	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New() error = %v", err)
	}
	t.Cleanup(func() {
		_ = db.Close()
	})

	sqlxDB := sqlx.NewDb(db, "sqlmock")
	svc := NewService(sqlxDB, NewRepository(sqlxDB))
	svc.http = &http.Client{
		Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
			return &http.Response{
				StatusCode: http.StatusOK,
				Header:     make(http.Header),
				Body: io.NopCloser(strings.NewReader(
					`{"token":"snap-token","redirect_url":"https://pay.example/redirect"}`,
				)),
			}, nil
		}),
	}

	return svc, mock
}

func TestCheckoutCreatesBillingOrder(t *testing.T) {
	t.Setenv("MIDTRANS_SERVER_KEY", "server-key")

	svc, mock := newBillingTestService(t)
	tenantID := uuid.New()

	mock.ExpectExec(regexp.QuoteMeta(`
		INSERT INTO billing_orders (
			tenant_id, order_id, plan, billing_interval, amount, currency, status, midtrans_raw, updated_at
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,$8,NOW()
		)`)).
		WithArgs(
			tenantID,
			sqlmock.AnyArg(),
			"pro",
			"monthly",
			int64(300000),
			"IDR",
			"pending",
			sqlmock.AnyArg(),
		).
		WillReturnResult(sqlmock.NewResult(1, 1))

	res, err := svc.Checkout(context.Background(), tenantID, "tenant-alpha", CheckoutReq{
		Plan:     "pro",
		Interval: "monthly",
	})
	if err != nil {
		t.Fatalf("Checkout() error = %v", err)
	}

	if res.Amount != 300000 {
		t.Fatalf("res.Amount = %d, want 300000", res.Amount)
	}
	if res.SnapToken != "snap-token" {
		t.Fatalf("res.SnapToken = %s, want snap-token", res.SnapToken)
	}
	if res.RedirectURL != "https://pay.example/redirect" {
		t.Fatalf("res.RedirectURL = %s, want https://pay.example/redirect", res.RedirectURL)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("ExpectationsWereMet() error = %v", err)
	}
}

func TestCheckoutBookingPaymentRejectsSettlementForActiveSession(t *testing.T) {
	t.Setenv("MIDTRANS_SERVER_KEY", "server-key")

	svc, mock := newBillingTestService(t)
	bookingID := uuid.New()
	tenantID := uuid.New()

	rows := sqlmock.NewRows([]string{
		"id",
		"tenant_id",
		"grand_total",
		"deposit_amount",
		"paid_amount",
		"balance_due",
		"payment_status",
		"status",
	}).AddRow(
		bookingID,
		tenantID,
		300000.0,
		120000.0,
		120000.0,
		180000.0,
		"partial_paid",
		"active",
	)

	mock.ExpectQuery(regexp.QuoteMeta(`
		SELECT id, tenant_id, grand_total, deposit_amount, paid_amount, balance_due, payment_status, status
		FROM bookings
		WHERE id = $1 AND tenant_id = $2
		LIMIT 1`)).
		WithArgs(bookingID, tenantID).
		WillReturnRows(rows)

	_, err := svc.CheckoutBookingPayment(context.Background(), tenantID, "tenant-alpha", bookingID, "settlement")
	if err == nil {
		t.Fatal("CheckoutBookingPayment() error = nil, want active-session settlement error")
	}
	if !strings.Contains(err.Error(), "SESI HARUS DIAKHIRI") {
		t.Fatalf("error = %q, want active-session settlement message", err.Error())
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("ExpectationsWereMet() error = %v", err)
	}
}

func TestCheckoutBookingPaymentCreatesDepositTransaction(t *testing.T) {
	t.Setenv("MIDTRANS_SERVER_KEY", "server-key")

	svc, mock := newBillingTestService(t)
	bookingID := uuid.New()
	tenantID := uuid.New()

	rows := sqlmock.NewRows([]string{
		"id",
		"tenant_id",
		"grand_total",
		"deposit_amount",
		"paid_amount",
		"balance_due",
		"payment_status",
		"status",
	}).AddRow(
		bookingID,
		tenantID,
		300000.0,
		120000.0,
		0.0,
		300000.0,
		"pending",
		"pending",
	)

	mock.ExpectQuery(regexp.QuoteMeta(`
		SELECT id, tenant_id, grand_total, deposit_amount, paid_amount, balance_due, payment_status, status
		FROM bookings
		WHERE id = $1 AND tenant_id = $2
		LIMIT 1`)).
		WithArgs(bookingID, tenantID).
		WillReturnRows(rows)

	res, err := svc.CheckoutBookingPayment(context.Background(), tenantID, "tenant-alpha", bookingID, "")
	if err != nil {
		t.Fatalf("CheckoutBookingPayment() error = %v", err)
	}

	if res.Amount != 120000 {
		t.Fatalf("res.Amount = %f, want 120000", res.Amount)
	}
	if res.DisplayLabel != "DP" {
		t.Fatalf("res.DisplayLabel = %s, want DP", res.DisplayLabel)
	}
	if res.SnapToken != "snap-token" {
		t.Fatalf("res.SnapToken = %s, want snap-token", res.SnapToken)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("ExpectationsWereMet() error = %v", err)
	}
}
