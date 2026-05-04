package middleware

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/helwiza/backend/internal/auth"
	"github.com/helwiza/backend/internal/tenant"
)

func TestAuthMiddlewareRejectsCrossTenantToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	t.Setenv("JWT_SECRET", "middleware-secret")

	svc := auth.NewService()
	userID := uuid.New()
	tokenTenantID := uuid.New()
	activeTenantID := uuid.New()

	token, err := svc.GenerateToken(userID, tokenTenantID, "owner")
	if err != nil {
		t.Fatalf("GenerateToken() error = %v", err)
	}

	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("tenantID", activeTenantID.String())
		c.Next()
	})
	router.Use(AuthMiddleware(nil))
	router.GET("/protected", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusForbidden)
	}
}

func TestAuthMiddlewareAllowsMatchingTenantAndSetsContext(t *testing.T) {
	gin.SetMode(gin.TestMode)
	t.Setenv("JWT_SECRET", "middleware-secret")

	svc := auth.NewService()
	userID := uuid.New()
	tenantID := uuid.New()

	token, err := svc.GenerateToken(userID, tenantID, "owner")
	if err != nil {
		t.Fatalf("GenerateToken() error = %v", err)
	}

	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("tenantID", tenantID.String())
		c.Next()
	})
	router.Use(AuthMiddleware(nil))
	router.GET("/protected", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"tenant_id": c.GetString("tenantID"),
			"user_id":   fmt.Sprint(c.MustGet("userID")),
			"user_role": c.GetString("userRole"),
			"auth_type": c.GetString("authType"),
		})
	})

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}

	var body map[string]string
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
	if body["tenant_id"] != tenantID.String() {
		t.Fatalf("tenant_id = %s, want %s", body["tenant_id"], tenantID.String())
	}
	if body["user_id"] != userID.String() {
		t.Fatalf("user_id = %s, want %s", body["user_id"], userID.String())
	}
	if body["user_role"] != "owner" {
		t.Fatalf("user_role = %s, want owner", body["user_role"])
	}
	if body["auth_type"] != "admin" {
		t.Fatalf("auth_type = %s, want admin", body["auth_type"])
	}
}

func TestRequirePermissionRejectsMissingPermission(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("userRole", "staff")
		c.Set("permissions", []string{tenant.PermissionBookingsRead})
		c.Next()
	})
	router.GET("/protected", RequirePermission(tenant.PermissionPosCheckout), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusForbidden)
	}
}

func TestRequirePermissionAllowsOwnerBypass(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("userRole", "owner")
		c.Next()
	})
	router.GET("/protected", RequirePermission(tenant.PermissionPosCheckout), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}
}

func TestRequireBookingStatusPermissionMapsStatusToPermission(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("userRole", "staff")
		c.Set("permissions", []string{
			tenant.PermissionBookingsRead,
			tenant.PermissionBookingsUpdate,
			tenant.PermissionPosRead,
			tenant.PermissionSessionsStart,
		})
		c.Next()
	})
	router.POST("/bookings/status", RequireBookingStatusPermission(), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"requested_status": c.GetString("bookingStatusRequest"),
		})
	})

	req := httptest.NewRequest(
		http.MethodPost,
		"/bookings/status",
		strings.NewReader(`{"status":"active"}`),
	)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}

	var body map[string]string
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
	if body["requested_status"] != "active" {
		t.Fatalf("requested_status = %s, want active", body["requested_status"])
	}
}
