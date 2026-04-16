package security

import "os"

const defaultJWTSecret = "batam-dev-secret-key-2026"

func JWTSecret() string {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		return defaultJWTSecret
	}
	return secret
}
