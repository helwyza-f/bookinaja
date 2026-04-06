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
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi diperlukan"})
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Format token salah"})
			c.Abort()
			return
		}

		tokenString := parts[1]
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte(os.Getenv("JWT_SECRET")), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Token tidak valid atau kadaluarsa"})
			c.Abort()
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Gagal membaca claims"})
			c.Abort()
			return
		}

		// --- LOGIC PEMBEDA ROLE ---
		
		tenantID := claims["tenant_id"]
		c.Set("tenantID", tenantID)

		// Cek apakah ini ADMIN atau CUSTOMER
		if userID, ok := claims["user_id"]; ok && userID != nil {
			// Jalur Admin
			c.Set("userID", userID)
			c.Set("userRole", claims["role"])
			c.Set("authType", "admin")
		} else if custID, ok := claims["customer_id"]; ok && custID != nil {
			// Jalur Customer
			c.Set("customerID", custID)
			c.Set("authType", "customer")
		} else {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Tipe akun tidak dikenali"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// AdminOnly adalah Guard tambahan untuk endpoint sensitif
func AdminOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		authType := c.GetString("authType")
		if authType != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Hanya Admin yang diizinkan"})
			c.Abort()
			return
		}
		c.Next()
	}
}