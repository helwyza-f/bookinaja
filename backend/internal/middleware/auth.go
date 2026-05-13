package middleware

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/helwiza/backend/internal/platform/access"
	"github.com/helwiza/backend/internal/platform/security"
	"github.com/helwiza/backend/internal/tenant"
	"github.com/jmoiron/sqlx"
)

func AuthMiddleware(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 1. Ambil & Validasi Format Header
		tokenString, err := extractBearerToken(c)
		if err != nil {
			abortUnauthorized(c, err.Error())
			return
		}

		// 2. Parse JWT
		token, err := parseJWT(tokenString)
		if err != nil {
			abortUnauthorized(c, "Sesi kedaluwarsa, silakan login kembali")
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok || !token.Valid {
			abortUnauthorized(c, "Kredensial tidak valid")
			return
		}

		// Customer token tidak perlu tenant cross-check berbasis subdomain,
		// tapi beberapa route (mis. upload proof) tetap butuh tenantID untuk storage path.
		if custID, ok := claims["customer_id"]; ok && custID != nil {
			if activeTenantID := c.GetString("tenantID"); activeTenantID == "" {
				if tokenTenantID := strings.TrimSpace(fmt.Sprintf("%v", claims["tenant_id"])); tokenTenantID != "" && tokenTenantID != "<nil>" {
					c.Set("tenantID", tokenTenantID)
				}
			}
			setAuthContext(c, claims)
			c.Next()
			return
		}

		// 3. MULTI-TENANCY CROSS-CHECK (CRITICAL FIX)
		activeTenantID := c.GetString("tenantID")
		tokenTenantID := fmt.Sprintf("%v", claims["tenant_id"])

		// FIX: Jika subdomain mendeteksi tenantID, tapi beda sama di token -> BLOKIR.
		// Tapi jika subdomain/header tidak mengirim tenantID (kosong),
		// kita TRUST tenantID yang ada di dalam token.
		if activeTenantID != "" && activeTenantID != tokenTenantID {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Akses ditolak: Token ini terdaftar untuk bisnis lain",
				"hint":  "Pastikan Anda login di subdomain yang benar",
			})
			c.Abort()
			return
		}

		// Jika context tenantID kosong (fallback), isi pake data dari token
		if activeTenantID == "" {
			c.Set("tenantID", tokenTenantID)
		}

		if userID, ok := claims["user_id"]; ok && userID != nil && db != nil {
			permissions, err := loadUserPermissions(c, db, fmt.Sprintf("%v", userID), fmt.Sprintf("%v", c.GetString("tenantID")))
			if err == nil {
				c.Set("permissions", tenant.ExpandPermissionKeys(permissions))
			}
		}

		// 4. Injeksi Identitas ke Context
		setAuthContext(c, claims)

		c.Next()
	}
}

// --- HELPERS (Tetap Sama) ---

func extractBearerToken(c *gin.Context) (string, error) {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		return "", fmt.Errorf("sesi diperlukan")
	}
	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		return "", fmt.Errorf("format header salah")
	}
	return parts[1], nil
}

func parseJWT(tokenString string) (*jwt.Token, error) {
	return jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("metode enkripsi tidak sesuai")
		}
		return []byte(security.JWTSecret()), nil
	})
}

func setAuthContext(c *gin.Context, claims jwt.MapClaims) {
	if userID, ok := claims["user_id"]; ok && userID != nil {
		c.Set("userID", userID)
		c.Set("userRole", claims["role"])
		c.Set("authType", "admin")
	} else if custID, ok := claims["customer_id"]; ok && custID != nil {
		c.Set("customerID", custID)
		c.Set("authType", "customer")
	}
}

func loadUserPermissions(c *gin.Context, db *sqlx.DB, userID, tenantID string) ([]string, error) {
	if strings.TrimSpace(userID) == "" || strings.TrimSpace(tenantID) == "" {
		return nil, nil
	}
	var permissions []string
	err := db.SelectContext(c.Request.Context(), &permissions, `
		SELECT DISTINCT permission_key
		FROM (
			SELECT UNNEST(COALESCE(sr.permission_keys, ARRAY[]::text[])) AS permission_key
			FROM users u
			LEFT JOIN staff_roles sr ON sr.id = u.role_id
			WHERE u.id = $1 AND u.tenant_id = $2

			UNION

			SELECT up.permission_key
			FROM user_permissions up
			JOIN users u ON u.id = up.user_id
			WHERE u.id = $1 AND u.tenant_id = $2
		) permissions
		WHERE permission_key IS NOT NULL AND TRIM(permission_key) <> ''
		ORDER BY permission_key ASC`, userID, tenantID)
	if err != nil {
		return nil, err
	}
	return permissions, nil
}

func abortUnauthorized(c *gin.Context, msg string) {
	c.JSON(http.StatusUnauthorized, gin.H{"error": msg})
	c.Abort()
}

func abortForbidden(c *gin.Context, msg string) {
	c.JSON(http.StatusForbidden, gin.H{"error": msg})
	c.Abort()
}

func AdminOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.GetString("authType") != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Hanya Admin yang diizinkan"})
			c.Abort()
			return
		}
		c.Next()
	}
}

func OwnerOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.GetString("userRole") != "owner" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Hanya owner yang diizinkan"})
			c.Abort()
			return
		}
		c.Next()
	}
}

func PlatformOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.GetString("userRole") != "platform_admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Hanya platform admin yang diizinkan"})
			c.Abort()
			return
		}
		c.Next()
	}
}

func RequirePermission(required ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if HasAnyPermission(c, required...) {
			c.Next()
			return
		}

		abortForbidden(c, "Akses modul ditolak")
	}
}

func RequireAnyTenantFeature(db *sqlx.DB, features ...access.Feature) gin.HandlerFunc {
	return func(c *gin.Context) {
		if len(features) == 0 || db == nil {
			c.Next()
			return
		}

		tenantID := strings.TrimSpace(c.GetString("tenantID"))
		if tenantID == "" {
			abortForbidden(c, "Context tenant tidak ditemukan")
			return
		}

		var snapshot struct {
			Plan      string     `db:"plan"`
			Status    string     `db:"subscription_status"`
			PeriodEnd *time.Time `db:"subscription_current_period_end"`
		}

		if err := db.GetContext(
			c.Request.Context(),
			&snapshot,
			`SELECT plan, subscription_status, subscription_current_period_end FROM tenants WHERE id = $1::uuid LIMIT 1`,
			tenantID,
		); err != nil {
			abortForbidden(c, "Tenant tidak ditemukan")
			return
		}

		for _, feature := range features {
			if access.HasFeature(snapshot.Plan, snapshot.Status, feature, snapshot.PeriodEnd) {
				c.Next()
				return
			}
		}

		abortForbidden(c, "Fitur belum aktif di plan tenant ini")
	}
}

func HasAnyPermission(c *gin.Context, required ...string) bool {
	if c.GetString("userRole") == "owner" {
		return true
	}

	raw, exists := c.Get("permissions")
	if !exists {
		return false
	}

	perms, _ := raw.([]string)
	if len(perms) == 0 {
		return false
	}

	requiredSet := map[string]struct{}{}
	for _, key := range required {
		key = strings.TrimSpace(key)
		if key != "" {
			requiredSet[key] = struct{}{}
		}
	}

	for _, permission := range perms {
		if _, ok := requiredSet[permission]; ok {
			return true
		}
	}

	return false
}

func RequireBookingStatusPermission() gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Status string `json:"status"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "STATUS TIDAK VALID"})
			c.Abort()
			return
		}

		c.Set("bookingStatusRequest", strings.ToLower(strings.TrimSpace(req.Status)))

		var required []string
		switch strings.ToLower(strings.TrimSpace(req.Status)) {
		case "confirmed":
			required = []string{tenant.PermissionBookingsConfirm}
		case "active":
			required = []string{tenant.PermissionSessionsStart}
		case "completed":
			required = []string{tenant.PermissionSessionsComplete}
		case "cancelled":
			required = []string{tenant.PermissionBookingsCancel}
		default:
			required = []string{tenant.PermissionBookingsUpdate}
		}

		if HasAnyPermission(c, required...) {
			c.Next()
			return
		}

		abortForbidden(c, "Akses aksi booking ditolak")
	}
}
