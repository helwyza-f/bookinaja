package auth

import (
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// CustomClaims adalah isi dari JWT Token kita
type CustomClaims struct {
	UserID             uuid.UUID `json:"user_id"`
	TenantID           uuid.UUID `json:"tenant_id"`
	Role               string    `json:"role"`
	Plan               string    `json:"plan,omitempty"`
	SubscriptionStatus string    `json:"subscription_status,omitempty"`
	PlanFeatures       []string  `json:"plan_features,omitempty"`
	EntitlementVersion string    `json:"entitlement_version,omitempty"`
	jwt.RegisteredClaims
}
