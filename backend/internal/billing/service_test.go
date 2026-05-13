package billing

import (
	"context"
	"database/sql"
	"io"
	"net/http"
	"regexp"
	"strings"
	"testing"
	"time"

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
			int64(349000),
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

	if res.Amount != 349000 {
		t.Fatalf("res.Amount = %d, want 349000", res.Amount)
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

	mock.ExpectQuery(regexp.QuoteMeta(`
		SELECT code, display_name, category, verification_type, provider, instructions, is_active, sort_order, metadata
		FROM tenant_payment_methods
		WHERE tenant_id = $1 AND code = $2 AND is_active = true
		LIMIT 1`)).
		WithArgs(tenantID, "midtrans").
		WillReturnRows(sqlmock.NewRows([]string{
			"code", "display_name", "category", "verification_type", "provider", "instructions", "is_active", "sort_order", "metadata",
		}).AddRow("midtrans", "Midtrans", "gateway", "auto", "midtrans", "auto", true, 1, []byte(`{}`)))

	_, err := svc.CheckoutBookingPayment(context.Background(), tenantID, "tenant-alpha", bookingID, "settlement", "")
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

func TestCheckoutBookingPaymentRejectsSettlementBeforeCompleted(t *testing.T) {
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
		"confirmed",
	)

	mock.ExpectQuery(regexp.QuoteMeta(`
		SELECT id, tenant_id, grand_total, deposit_amount, paid_amount, balance_due, payment_status, status
		FROM bookings
		WHERE id = $1 AND tenant_id = $2
		LIMIT 1`)).
		WithArgs(bookingID, tenantID).
		WillReturnRows(rows)

	mock.ExpectQuery(regexp.QuoteMeta(`
		SELECT code, display_name, category, verification_type, provider, instructions, is_active, sort_order, metadata
		FROM tenant_payment_methods
		WHERE tenant_id = $1 AND code = $2 AND is_active = true
		LIMIT 1`)).
		WithArgs(tenantID, "midtrans").
		WillReturnRows(sqlmock.NewRows([]string{
			"code", "display_name", "category", "verification_type", "provider", "instructions", "is_active", "sort_order", "metadata",
		}).AddRow("midtrans", "Midtrans", "gateway", "auto", "midtrans", "auto", true, 1, []byte(`{}`)))

	_, err := svc.CheckoutBookingPayment(context.Background(), tenantID, "tenant-alpha", bookingID, "settlement", "")
	if err == nil {
		t.Fatal("CheckoutBookingPayment() error = nil, want settlement-after-completed error")
	}
	if !strings.Contains(err.Error(), "setelah sesi selesai") {
		t.Fatalf("error = %q, want settlement-after-completed message", err.Error())
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

	mock.ExpectQuery(regexp.QuoteMeta(`
		SELECT code, display_name, category, verification_type, provider, instructions, is_active, sort_order, metadata
		FROM tenant_payment_methods
		WHERE tenant_id = $1 AND code = $2 AND is_active = true
		LIMIT 1`)).
		WithArgs(tenantID, "midtrans").
		WillReturnRows(sqlmock.NewRows([]string{
			"code", "display_name", "category", "verification_type", "provider", "instructions", "is_active", "sort_order", "metadata",
		}).AddRow("midtrans", "Midtrans", "gateway", "auto", "midtrans", "auto", true, 1, []byte(`{}`)))

	mock.ExpectExec(regexp.QuoteMeta(`
		INSERT INTO booking_payment_attempts (
			id, booking_id, tenant_id, customer_id, method_code, method_label, category, verification_type, payment_scope,
			amount, status, reference_code, gateway_order_id, gateway_transaction_id, payer_note, admin_note, proof_url,
			metadata, submitted_at, verified_at, rejected_at, expires_at, created_at, updated_at
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,$8,$9,
			$10,$11,$12,$13,$14,$15,$16,$17,
			$18,$19,$20,$21,$22,$23,$24
		)`)).
		WithArgs(
			sqlmock.AnyArg(),
			bookingID,
			tenantID,
			nil,
			"midtrans",
			"Midtrans",
			"gateway",
			"auto",
			"deposit",
			int64(120000),
			"pending",
			sqlmock.AnyArg(),
			sqlmock.AnyArg(),
			"",
			"",
			"",
			"",
			sqlmock.AnyArg(),
			nil,
			nil,
			nil,
			nil,
			sqlmock.AnyArg(),
			sqlmock.AnyArg(),
		).
		WillReturnResult(sqlmock.NewResult(1, 1))

	res, err := svc.CheckoutBookingPayment(context.Background(), tenantID, "tenant-alpha", bookingID, "", "")
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

func TestSubmitManualBookingPaymentRejectsSettlementBeforeCompleted(t *testing.T) {
	svc, mock := newBillingTestService(t)
	bookingID := uuid.New()
	tenantID := uuid.New()

	mock.ExpectQuery(regexp.QuoteMeta(`
		SELECT code, display_name, category, verification_type, provider, instructions, is_active, sort_order, metadata
		FROM tenant_payment_methods
		WHERE tenant_id = $1 AND code = $2 AND is_active = true
		LIMIT 1`)).
		WithArgs(tenantID, "bank_transfer").
		WillReturnRows(sqlmock.NewRows([]string{
			"code", "display_name", "category", "verification_type", "provider", "instructions", "is_active", "sort_order", "metadata",
		}).AddRow("bank_transfer", "Transfer Bank", "manual", "manual", "bank_transfer", "manual", true, 2, []byte(`{}`)))

	mock.ExpectQuery(regexp.QuoteMeta(`
		SELECT id, tenant_id, grand_total, deposit_amount, paid_amount, balance_due, payment_status, status
		FROM bookings
		WHERE id = $1 AND tenant_id = $2
		LIMIT 1`)).
		WithArgs(bookingID, tenantID).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "tenant_id", "grand_total", "deposit_amount", "paid_amount", "balance_due", "payment_status", "status",
		}).AddRow(
			bookingID,
			tenantID,
			300000.0,
			120000.0,
			120000.0,
			180000.0,
			"partial_paid",
			"confirmed",
		))

	_, err := svc.SubmitManualBookingPayment(context.Background(), tenantID, bookingID, nil, "settlement", "bank_transfer", "", "")
	if err == nil {
		t.Fatal("SubmitManualBookingPayment() error = nil, want settlement-after-completed error")
	}
	if !strings.Contains(err.Error(), "setelah sesi selesai") {
		t.Fatalf("error = %q, want settlement-after-completed message", err.Error())
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("ExpectationsWereMet() error = %v", err)
	}
}

func TestSubmitManualBookingPaymentRejectsCashForDeposit(t *testing.T) {
	svc, mock := newBillingTestService(t)
	bookingID := uuid.New()
	tenantID := uuid.New()

	mock.ExpectQuery(regexp.QuoteMeta(`
		SELECT code, display_name, category, verification_type, provider, instructions, is_active, sort_order, metadata
		FROM tenant_payment_methods
		WHERE tenant_id = $1 AND code = $2 AND is_active = true
		LIMIT 1`)).
		WithArgs(tenantID, "cash").
		WillReturnRows(sqlmock.NewRows([]string{
			"code", "display_name", "category", "verification_type", "provider", "instructions", "is_active", "sort_order", "metadata",
		}).AddRow("cash", "Cash", "manual", "manual", "cash", "manual", true, 4, []byte(`{}`)))

	mock.ExpectQuery(regexp.QuoteMeta(`
		SELECT id, tenant_id, grand_total, deposit_amount, paid_amount, balance_due, payment_status, status
		FROM bookings
		WHERE id = $1 AND tenant_id = $2
		LIMIT 1`)).
		WithArgs(bookingID, tenantID).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "tenant_id", "grand_total", "deposit_amount", "paid_amount", "balance_due", "payment_status", "status",
		}).AddRow(
			bookingID,
			tenantID,
			300000.0,
			120000.0,
			0.0,
			300000.0,
			"pending",
			"pending",
		))

	_, err := svc.SubmitManualBookingPayment(context.Background(), tenantID, bookingID, nil, "deposit", "cash", "", "")
	if err == nil {
		t.Fatal("SubmitManualBookingPayment() error = nil, want cash-DP rejection")
	}
	if !strings.Contains(err.Error(), "tidak tersedia untuk pembayaran DP") {
		t.Fatalf("error = %q, want cash-DP rejection message", err.Error())
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("ExpectationsWereMet() error = %v", err)
	}
}

func TestVerifyManualBookingPaymentRejectPreservesConcurrentBookingStatus(t *testing.T) {
	svc, mock := newBillingTestService(t)
	attemptID := uuid.New()
	bookingID := uuid.New()
	tenantID := uuid.New()
	now := time.Now().UTC()

	mock.ExpectBegin()

	mock.ExpectQuery(regexp.QuoteMeta(`
		SELECT *
		FROM booking_payment_attempts
		WHERE id = $1 AND tenant_id = $2
		LIMIT 1`)).
		WithArgs(attemptID, tenantID).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "booking_id", "tenant_id", "customer_id", "method_code", "method_label", "category", "verification_type",
			"payment_scope", "amount", "status", "reference_code", "gateway_order_id", "gateway_transaction_id",
			"payer_note", "admin_note", "proof_url", "metadata", "submitted_at", "verified_at", "rejected_at", "expires_at",
			"created_at", "updated_at",
		}).AddRow(
			attemptID,
			bookingID,
			tenantID,
			nil,
			"bank_transfer",
			"Transfer Bank",
			"manual",
			"manual",
			"deposit",
			int64(120000),
			"awaiting_verification",
			"MANUAL-1",
			"",
			"",
			"",
			"",
			"",
			[]byte(`{"previous_payment_status":"pending","previous_booking_status":"pending","previous_paid_amount":0,"previous_balance_due":300000}`),
			nil,
			nil,
			nil,
			nil,
			now,
			now,
		))

	mock.ExpectQuery(regexp.QuoteMeta(`
		SELECT id, tenant_id, grand_total, deposit_amount, paid_amount, balance_due, payment_status, status
		FROM bookings
		WHERE id = $1 AND tenant_id = $2
		LIMIT 1`)).
		WithArgs(bookingID, tenantID).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "tenant_id", "grand_total", "deposit_amount", "paid_amount", "balance_due", "payment_status", "status",
		}).AddRow(
			bookingID,
			tenantID,
			300000.0,
			120000.0,
			0.0,
			300000.0,
			"awaiting_verification",
			"cancelled",
		))

	mock.ExpectExec(regexp.QuoteMeta(`
		UPDATE bookings
		SET payment_status = $2,
			paid_amount = $3,
			balance_due = $4,
			status = $5
		WHERE id = $1`)).
		WithArgs(bookingID, "pending", 0.0, 300000.0, "cancelled").
		WillReturnResult(sqlmock.NewResult(1, 1))

	mock.ExpectExec(regexp.QuoteMeta(`
		UPDATE booking_payment_attempts
		SET status = $2::text,
			gateway_transaction_id = CASE WHEN $3::text IS NOT NULL THEN $3::text ELSE gateway_transaction_id END,
			admin_note = CASE WHEN $4::text IS NOT NULL THEN $4::text ELSE admin_note END,
			verified_at = CASE WHEN $2::text IN ('paid', 'verified', 'settled') THEN COALESCE(verified_at, NOW()) ELSE verified_at END,
			rejected_at = CASE WHEN $2::text = 'rejected' THEN COALESCE(rejected_at, NOW()) ELSE rejected_at END,
			updated_at = NOW()
		WHERE id = $1`)).
		WithArgs(attemptID, "rejected", nil, "catatan admin").
		WillReturnResult(sqlmock.NewResult(1, 1))

	mock.ExpectQuery(regexp.QuoteMeta(`
		SELECT
			b.id AS booking_id,
			b.tenant_id,
			b.customer_id,
			b.access_token,
			c.name AS customer_name,
			c.phone AS customer_phone,
			t.slug AS tenant_slug,
			res.name AS resource_name,
			b.grand_total,
			b.deposit_amount,
			b.paid_amount,
			b.balance_due,
			b.payment_status,
			b.status
		FROM bookings b
		JOIN customers c ON c.id = b.customer_id
		JOIN tenants t ON t.id = b.tenant_id
		JOIN resources res ON res.id = b.resource_id
		WHERE b.id = $1
		LIMIT 1`)).
		WithArgs(bookingID).
		WillReturnError(sql.ErrNoRows)

	mock.ExpectCommit()

	if err := svc.VerifyManualBookingPayment(context.Background(), tenantID, attemptID, false, "catatan admin"); err != nil {
		t.Fatalf("VerifyManualBookingPayment() error = %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("ExpectationsWereMet() error = %v", err)
	}
}

func TestWaPaymentReceivedMessageUsesReadableSummary(t *testing.T) {
	got := waPaymentReceivedMessage(
		"Rina",
		"Pelunasan booking kamu sudah diterima.",
		"booking-12345678",
		"VIP Room",
		300000,
		120000,
		300000,
		0,
		"https://bookinaja.test/detail",
	)

	for _, want := range []string{
		"Ringkasan pembayaran",
		"Ref         : *BOOKING-*",
		"Total       : Rp 300.000",
		"DP          : Rp 120.000",
		"Sudah bayar : Rp 300.000",
		"Sisa bayar  : Rp 0",
		"Status pembayaran: booking kamu sudah lunas.",
	} {
		if !strings.Contains(got, want) {
			t.Fatalf("message missing %q in %q", want, got)
		}
	}
}
