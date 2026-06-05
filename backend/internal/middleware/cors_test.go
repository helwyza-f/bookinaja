package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestCORSMiddlewareAllowsConfiguredOrigin(t *testing.T) {
	gin.SetMode(gin.TestMode)
	t.Setenv("CORS_ALLOWED_ORIGINS", "https://bookinaja.com,https://*.bookinaja.com,http://*.lvh.me:3000")

	router := gin.New()
	router.Use(CORSMiddleware())
	router.GET("/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	req := httptest.NewRequest(http.MethodGet, "/ping", nil)
	req.Header.Set("Origin", "https://gaming-demo.bookinaja.com")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "https://gaming-demo.bookinaja.com" {
		t.Fatalf("Access-Control-Allow-Origin = %q", got)
	}
}

func TestCORSMiddlewareAllowsExactLVHMeOrigin(t *testing.T) {
	gin.SetMode(gin.TestMode)
	t.Setenv("CORS_ALLOWED_ORIGINS", "http://lvh.me:3000,http://*.lvh.me:3000")

	router := gin.New()
	router.Use(CORSMiddleware())
	router.POST("/ping", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodOptions, "/ping", nil)
	req.Header.Set("Origin", "http://lvh.me:3000")
	req.Header.Set("Access-Control-Request-Headers", "authorization,content-type")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusNoContent)
	}
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "http://lvh.me:3000" {
		t.Fatalf("Access-Control-Allow-Origin = %q", got)
	}
}

func TestCORSMiddlewareAllowsLocalhostWildcardPort(t *testing.T) {
	gin.SetMode(gin.TestMode)
	t.Setenv("CORS_ALLOWED_ORIGINS", "http://localhost:*,http://127.0.0.1:*,http://*.lvh.me:*")

	router := gin.New()
	router.Use(CORSMiddleware())
	router.POST("/ping", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	for _, origin := range []string{"http://localhost:3002", "http://127.0.0.1:3002", "http://smoke-gaming.lvh.me:3002"} {
		req := httptest.NewRequest(http.MethodOptions, "/ping", nil)
		req.Header.Set("Origin", origin)
		req.Header.Set("Access-Control-Request-Headers", "content-type")
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)

		if rec.Code != http.StatusNoContent {
			t.Fatalf("origin %s status = %d, want %d", origin, rec.Code, http.StatusNoContent)
		}
		if got := rec.Header().Get("Access-Control-Allow-Origin"); got != origin {
			t.Fatalf("origin %s Access-Control-Allow-Origin = %q", origin, got)
		}
	}
}

func TestCORSMiddlewareRejectsUnknownPreflightOrigin(t *testing.T) {
	gin.SetMode(gin.TestMode)
	t.Setenv("CORS_ALLOWED_ORIGINS", "https://bookinaja.com")

	router := gin.New()
	router.Use(CORSMiddleware())
	router.POST("/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	req := httptest.NewRequest(http.MethodOptions, "/ping", nil)
	req.Header.Set("Origin", "https://evil.example")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusForbidden)
	}
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Fatalf("Access-Control-Allow-Origin = %q, want empty", got)
	}
}
