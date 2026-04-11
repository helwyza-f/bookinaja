package middleware

import (
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
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
			abortUnauthorized(c, "Token tidak valid atau kadaluarsa")
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok || !token.Valid {
			abortUnauthorized(c, "Gagal memproses kredensial")
			return
		}

		// 3. MULTI-TENANCY CROSS-CHECK (The Game Changer)
		// Kita ambil tenantID yang dideteksi oleh TenantIdentifier (Subdomain/Header)
		activeTenantID := c.GetString("tenantID")
		tokenTenantID := fmt.Sprintf("%v", claims["tenant_id"])

		// Jika request masuk ke tenant tertentu, token HARUS berasal dari tenant yang sama
		if activeTenantID != "" && activeTenantID != tokenTenantID {
			c.JSON(http.StatusForbidden, gin.H{"error": "Akses ditolak: Token tidak valid untuk bisnis ini"})
			c.Abort()
			return
		}

		// 4. Injeksi Identitas ke Context (Type Safe)
		setAuthContext(c, claims)

		c.Next()
	}
}

// --- HELPERS ---

func extractBearerToken(c *gin.Context) (string, error) {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		return "", fmt.Errorf("sesi diperlukan")
	}
	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		return "", fmt.Errorf("format header authorization salah")
	}
	return parts[1], nil
}

func parseJWT(tokenString string) (*jwt.Token, error) {
	return jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("metode enkripsi tidak sesuai")
		}
		return []byte(os.Getenv("JWT_SECRET")), nil
	})
}

func setAuthContext(c *gin.Context, claims jwt.MapClaims) {
	// Simpan Tenant ID dari token sebagai cadangan jika identifier kosong
	if c.GetString("tenantID") == "" {
		c.Set("tenantID", fmt.Sprintf("%v", claims["tenant_id"]))
	}

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

// AdminOnly Guard
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