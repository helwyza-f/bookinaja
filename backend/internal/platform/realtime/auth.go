package realtime

import (
	"context"
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
	TenantSlug string
	Role       string
}

// TenantAccessVerifier memeriksa apakah sebuah akun benar-benar anggota tenant.
// Dipakai saat token account memilih workspace lewat query slug pada koneksi WS,
// agar akun tidak bisa berlangganan channel tenant lain hanya dengan menebak slug.
type TenantAccessVerifier interface {
	HasTenantAccess(ctx context.Context, accountID, tenantID string) (bool, error)
}

func Authenticate(c *gin.Context, verifier TenantAccessVerifier) (*Principal, error) {
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
		TenantID:   normalizeClaimString(claims["tenant_id"]),
		TenantSlug: resolveTenantSlug(c),
		Role:       strings.TrimSpace(fmt.Sprintf("%v", claims["role"])),
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
			// Token account belum terikat tenant di klaim; tenant dipilih lewat
			// slug (di-resolve oleh TenantIdentifier). Wajib verifikasi keanggotaan
			// sebelum mengikat konteks realtime ke tenant tersebut.
			activeTenantID := strings.TrimSpace(c.GetString("tenantID"))
			if activeTenantID == "" {
				return nil, fmt.Errorf("tenant websocket tidak ditemukan")
			}
			accountID := normalizeClaimString(claims["account_id"])
			if accountID == "" {
				return nil, fmt.Errorf("akun websocket tidak valid")
			}
			if verifier == nil {
				return nil, fmt.Errorf("verifikasi akses tenant tidak tersedia")
			}
			allowed, err := verifier.HasTenantAccess(c.Request.Context(), accountID, activeTenantID)
			if err != nil || !allowed {
				return nil, fmt.Errorf("akun tidak punya akses ke tenant websocket")
			}
			principal.TenantID = activeTenantID
		}
		return principal, nil
	}

	return nil, fmt.Errorf("kredensial tidak valid")
}

// resolveTenantSlug mengambil slug tenant aktif untuk koneksi WS.
// Prioritas: hasil resolve TenantIdentifier middleware, lalu query "slug".
func resolveTenantSlug(c *gin.Context) string {
	if slug := strings.TrimSpace(c.GetString("tenantSlug")); slug != "" {
		return strings.ToLower(slug)
	}
	return strings.ToLower(strings.TrimSpace(c.Query("slug")))
}

func normalizeClaimString(value any) string {
	s := strings.TrimSpace(fmt.Sprintf("%v", value))
	switch s {
	case "", "<nil>", "00000000-0000-0000-0000-000000000000":
		return ""
	default:
		return s
	}
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
