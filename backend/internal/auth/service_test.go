package auth

import (
	"testing"

	"github.com/google/uuid"
)

func TestGenerateAndValidateTokenRoundTrip(t *testing.T) {
	t.Setenv("JWT_SECRET", "unit-test-secret")

	svc := NewService()
	userID := uuid.New()
	tenantID := uuid.New()

	token, err := svc.GenerateToken(userID, tenantID, "owner")
	if err != nil {
		t.Fatalf("GenerateToken() error = %v", err)
	}

	claims, err := svc.ValidateToken(token)
	if err != nil {
		t.Fatalf("ValidateToken() error = %v", err)
	}

	if claims.UserID != userID {
		t.Fatalf("claims.UserID = %s, want %s", claims.UserID, userID)
	}
	if claims.TenantID != tenantID {
		t.Fatalf("claims.TenantID = %s, want %s", claims.TenantID, tenantID)
	}
	if claims.Role != "owner" {
		t.Fatalf("claims.Role = %s, want owner", claims.Role)
	}
}

func TestValidateTokenRejectsInvalidToken(t *testing.T) {
	t.Setenv("JWT_SECRET", "unit-test-secret")

	svc := NewService()
	if _, err := svc.ValidateToken("not-a-token"); err == nil {
		t.Fatal("ValidateToken() error = nil, want invalid token error")
	}
}
