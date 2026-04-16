package platformadmin

import (
	"errors"
	"os"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/helwiza/saas/internal/platform/security"
)

type Service struct{ repo *Repository }

func NewService(repo *Repository) *Service { return &Service{repo: repo} }

func (s *Service) Login(email, password string) (string, error) {
	if email != os.Getenv("PLATFORM_ADMIN_EMAIL") || password != os.Getenv("PLATFORM_ADMIN_PASSWORD") {
		return "", errors.New("email atau password salah")
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id":   uuid.New().String(),
		"tenant_id": uuid.Nil.String(),
		"role":      "platform_admin",
	})
	return token.SignedString([]byte(security.JWTSecret()))
}
