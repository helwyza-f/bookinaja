package middleware

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// runSubGate menjalankan RequireActiveSubscription dengan satu baris tenant
// (plan/status/period_end) yang di-mock, lalu mengembalikan status code.
func runSubGate(t *testing.T, status string, periodEnd *time.Time) (int, string) {
	t.Helper()
	gin.SetMode(gin.TestMode)

	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New() error = %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })

	tenantID := uuid.New()
	rows := sqlmock.NewRows([]string{"plan", "subscription_status", "subscription_current_period_end"}).
		AddRow("trial", status, periodEnd)
	mock.ExpectQuery("SELECT plan, subscription_status, subscription_current_period_end FROM tenants").
		WithArgs(tenantID.String()).
		WillReturnRows(rows)

	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("tenantID", tenantID.String())
		c.Next()
	})
	router.POST("/create", RequireActiveSubscription(sqlx.NewDb(db, "sqlmock")), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	req := httptest.NewRequest(http.MethodPost, "/create", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	var body map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &body)
	code, _ := body["code"].(string)
	return rec.Code, code
}

func TestRequireActiveSubscription_ActiveTrialAllows(t *testing.T) {
	future := time.Now().Add(24 * time.Hour)
	got, _ := runSubGate(t, "trial", &future)
	if got != http.StatusOK {
		t.Fatalf("trial aktif: status = %d, want %d", got, http.StatusOK)
	}
}

func TestRequireActiveSubscription_ExpiredTrialBlocks(t *testing.T) {
	past := time.Now().Add(-24 * time.Hour)
	got, code := runSubGate(t, "trial", &past)
	if got != http.StatusPaymentRequired {
		t.Fatalf("trial expired: status = %d, want %d", got, http.StatusPaymentRequired)
	}
	if code != "subscription_inactive" {
		t.Fatalf("trial expired: code = %q, want subscription_inactive", code)
	}
}

func TestRequireActiveSubscription_InactiveBlocks(t *testing.T) {
	got, code := runSubGate(t, "inactive", nil)
	if got != http.StatusPaymentRequired {
		t.Fatalf("inactive: status = %d, want %d", got, http.StatusPaymentRequired)
	}
	if code != "subscription_inactive" {
		t.Fatalf("inactive: code = %q, want subscription_inactive", code)
	}
}

func TestRequireActiveSubscription_ActiveNoPeriodAllows(t *testing.T) {
	got, _ := runSubGate(t, "active", nil)
	if got != http.StatusOK {
		t.Fatalf("active tanpa period_end: status = %d, want %d", got, http.StatusOK)
	}
}
