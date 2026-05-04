package reservation

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestCreateRejectsInvalidPayload(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := NewHandler(nil, nil)
	router := gin.New()
	router.POST("/bookings", handler.Create)

	req := httptest.NewRequest(http.MethodPost, "/bookings", strings.NewReader(`{"customer_name":"Test"}`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusBadRequest)
	}
}
