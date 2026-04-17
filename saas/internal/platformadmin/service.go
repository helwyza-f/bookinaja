package platformadmin

import (
	"errors"
	"os"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

type Service struct{}

func NewService() *Service { return &Service{} }

func (s *Service) Authenticate(email, password string) error {
	adminEmail := strings.TrimSpace(os.Getenv("PLATFORM_ADMIN_EMAIL"))
	adminPassword := os.Getenv("PLATFORM_ADMIN_PASSWORD")
	if adminEmail == "" || adminPassword == "" {
		return errors.New("platform admin credentials not configured")
	}
	if !strings.EqualFold(strings.TrimSpace(email), adminEmail) {
		return errors.New("invalid credentials")
	}
	// Support plain text in local env and bcrypt hash if provided
	if strings.HasPrefix(adminPassword, "$2a$") || strings.HasPrefix(adminPassword, "$2b$") {
		return bcrypt.CompareHashAndPassword([]byte(adminPassword), []byte(password))
	}
	if adminPassword != password {
		return errors.New("invalid credentials")
	}
	return nil
}

func (s *Service) BuildSessionToken() (string, time.Time) {
	return "", time.Now()
}

