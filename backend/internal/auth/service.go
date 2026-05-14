package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/helwiza/backend/internal/platform/security"
)

type Service struct {
	secret string
}

type EntitlementSnapshot struct {
	Plan               string
	SubscriptionStatus string
	PlanFeatures       []string
	EntitlementVersion string
}

func NewService() *Service {
	secret := security.JWTSecret()
	return &Service{secret: secret}
}

// GenerateToken membuat token baru untuk user yang berhasil login
func (s *Service) GenerateToken(userID, tenantID uuid.UUID, role string) (string, error) {
	return s.GenerateTokenWithSnapshot(userID, tenantID, role, EntitlementSnapshot{})
}

func (s *Service) GenerateTokenWithSnapshot(userID, tenantID uuid.UUID, role string, snapshot EntitlementSnapshot) (string, error) {
	claims := CustomClaims{
		UserID:             userID,
		TenantID:           tenantID,
		Role:               role,
		Plan:               snapshot.Plan,
		SubscriptionStatus: snapshot.SubscriptionStatus,
		PlanFeatures:       snapshot.PlanFeatures,
		EntitlementVersion: snapshot.EntitlementVersion,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour * 168)), // 7 Hari
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.secret))
}

// ValidateToken mengecek apakah token valid dan mengembalikan claims-nya
func (s *Service) ValidateToken(tokenString string) (*CustomClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &CustomClaims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(s.secret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*CustomClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("token tidak valid")
}
