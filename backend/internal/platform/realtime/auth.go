package realtime

import (
	"fmt"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/helwiza/backend/internal/platform/security"
)

type Principal struct {
	AuthType   string
	UserID     string
	CustomerID string
	TenantID   string
	Role       string
}

func Authenticate(c *gin.Context) (*Principal, error) {
	tokenString, err := extractToken(c)
	if err != nil {
		return nil, err
	}

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("metode enkripsi tidak sesuai")
		}
		return []byte(security.JWTSecret()), nil
	})
	if err != nil {
		return nil, fmt.Errorf("sesi kedaluwarsa, silakan login kembali")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("kredensial tidak valid")
	}

	principal := &Principal{
		TenantID: strings.TrimSpace(fmt.Sprintf("%v", claims["tenant_id"])),
		Role:     strings.TrimSpace(fmt.Sprintf("%v", claims["role"])),
	}

	if custID, ok := claims["customer_id"]; ok && custID != nil {
		principal.AuthType = "customer"
		principal.CustomerID = strings.TrimSpace(fmt.Sprintf("%v", custID))
		return principal, nil
	}

	if userID, ok := claims["user_id"]; ok && userID != nil {
		principal.AuthType = "admin"
		principal.UserID = strings.TrimSpace(fmt.Sprintf("%v", userID))
		if principal.TenantID == "" {
			if activeTenantID := strings.TrimSpace(c.GetString("tenantID")); activeTenantID != "" {
				principal.TenantID = activeTenantID
			}
		}
		return principal, nil
	}

	return nil, fmt.Errorf("kredensial tidak valid")
}

func extractToken(c *gin.Context) (string, error) {
	if token := strings.TrimSpace(c.Query("token")); token != "" {
		return token, nil
	}

	authHeader := strings.TrimSpace(c.GetHeader("Authorization"))
	if authHeader == "" {
		return "", fmt.Errorf("token websocket diperlukan")
	}

	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return "", fmt.Errorf("format token websocket salah")
	}
	return strings.TrimSpace(parts[1]), nil
}

