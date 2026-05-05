package billing

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"regexp"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func TestBookingCheckoutResolvesTenantIDFromBookingWhenContextMissing(t *testing.T) {
	t.Setenv("MIDTRANS_SERVER_KEY", "server-key")
	gin.SetMode(gin.TestMode)

	svc, mock := newBillingTestService(t)
	handler := NewHandler(svc)

	bookingID := uuid.New()
	tenantID := uuid.New()

	mock.ExpectQuery(regexp.QuoteMeta(`
		SELECT tenant_id
		FROM bookings
		WHERE id = $1
		LIMIT 1`)).
		WithArgs(bookingID).
		WillReturnRows(sqlmock.NewRows([]string{"tenant_id"}).AddRow(tenantID))

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

	router := gin.New()
	router.POST("/api/v1/public/bookings/:id/checkout", handler.BookingCheckout)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/public/bookings/"+bookingID.String()+"/checkout?mode=dp&method=midtrans", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d; body=%s", rec.Code, http.StatusOK, rec.Body.String())
	}

	var res BookingCheckoutRes
	if err := json.Unmarshal(rec.Body.Bytes(), &res); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
	if res.SnapToken != "snap-token" {
		t.Fatalf("res.SnapToken = %q, want snap-token", res.SnapToken)
	}
	if res.MethodCode != "midtrans" {
		t.Fatalf("res.MethodCode = %q, want midtrans", res.MethodCode)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("ExpectationsWereMet() error = %v", err)
	}
}
