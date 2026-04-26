package customer

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/helwiza/saas/internal/platform/security"
)

func GenerateAuthToken(customerID, tenantID, tenantSlug string, ttl time.Duration) (string, error) {
	if ttl <= 0 {
		ttl = time.Hour * 72
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"customer_id": customerID,
		"tenant_id":   tenantID,
		"tenant_slug": tenantSlug,
		"role":        "customer",
		"exp":         time.Now().Add(ttl).Unix(),
	})
	return token.SignedString([]byte(security.JWTSecret()))
}
