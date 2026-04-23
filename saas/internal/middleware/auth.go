package middleware

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/helwiza/saas/internal/platform/security"
)

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 1. Ambil & Validasi Format Header
		tokenString, err := extractBearerToken(c)
		if err != nil {
			abortUnauthorized(c, err.Error())
			return
		}

		// 2. Parse JWT
		token, err := parseJWT(tokenString)
		if err != nil {
			abortUnauthorized(c, "Sesi kedaluwarsa, silakan login kembali")
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok || !token.Valid {
			abortUnauthorized(c, "Kredensial tidak valid")
			return
		}

		// 3. MULTI-TENANCY CROSS-CHECK (CRITICAL FIX)
		activeTenantID := c.GetString("tenantID")
		tokenTenantID := fmt.Sprintf("%v", claims["tenant_id"])

		// FIX: Jika subdomain mendeteksi tenantID, tapi beda sama di token -> BLOKIR.
		// Tapi jika subdomain/header tidak mengirim tenantID (kosong),
		// kita TRUST tenantID yang ada di dalam token.
		if activeTenantID != "" && activeTenantID != tokenTenantID {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Akses ditolak: Token ini terdaftar untuk bisnis lain",
				"hint":  "Pastikan Anda login di subdomain yang benar",
			})
			c.Abort()
			return
		}

		// Jika context tenantID kosong (fallback), isi pake data dari token
		if activeTenantID == "" {
			c.Set("tenantID", tokenTenantID)
		}

		// 4. Injeksi Identitas ke Context
		setAuthContext(c, claims)

		c.Next()
	}
}

// --- HELPERS (Tetap Sama) ---

func extractBearerToken(c *gin.Context) (string, error) {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		return "", fmt.Errorf("sesi diperlukan")
	}
	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		return "", fmt.Errorf("format header salah")
	}
	return parts[1], nil
}

func parseJWT(tokenString string) (*jwt.Token, error) {
	return jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("metode enkripsi tidak sesuai")
		}
		return []byte(security.JWTSecret()), nil
	})
}

func setAuthContext(c *gin.Context, claims jwt.MapClaims) {
	if userID, ok := claims["user_id"]; ok && userID != nil {
		c.Set("userID", userID)
		c.Set("userRole", claims["role"])
		c.Set("authType", "admin")
	} else if custID, ok := claims["customer_id"]; ok && custID != nil {
		c.Set("customerID", custID)
		c.Set("authType", "customer")
	}
}

func abortUnauthorized(c *gin.Context, msg string) {
	c.JSON(http.StatusUnauthorized, gin.H{"error": msg})
	c.Abort()
}

func AdminOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.GetString("authType") != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Hanya Admin yang diizinkan"})
			c.Abort()
			return
		}
		c.Next()
	}
}

func OwnerOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.GetString("userRole") != "owner" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Hanya owner yang diizinkan"})
			c.Abort()
			return
		}
		c.Next()
	}
}

func PlatformOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.GetString("userRole") != "platform_admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Hanya platform admin yang diizinkan"})
			c.Abort()
			return
		}
		c.Next()
	}
}
