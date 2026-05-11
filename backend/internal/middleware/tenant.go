package middleware

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	"github.com/redis/go-redis/v9"
)

const missingTenantCacheValue = "__missing__"

// TenantIdentifier mendeteksi siapa pemilik resource berdasarkan konteks request.
func TenantIdentifier(db *sqlx.DB, rdb *redis.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		hostSlug := extractTenantSlug(c)
		headerTenantID := strings.TrimSpace(c.GetHeader("X-Tenant-ID"))
		headerTenantSlug := normalizeSlug(c.GetHeader("X-Tenant-Slug"))
		querySlug := normalizeSlug(c.Query("slug"))

		slug := hostSlug
		if slug == "" && headerTenantSlug != "" {
			slug = headerTenantSlug
		}
		if slug == "" && querySlug != "" {
			slug = querySlug
		}

		if slug != "" {
			tenantID, err := lookupTenantIDBySlug(ctx, db, rdb, slug)
			if err == nil && tenantID != "" {
				if headerTenantID != "" && headerTenantID != tenantID {
					log.Printf(
						"[TENANT] stale_header_ignored host=%q path=%s slug=%s header_tenant_id=%s resolved_tenant_id=%s",
						c.Request.Host,
						c.Request.URL.Path,
						slug,
						headerTenantID,
						tenantID,
					)
				}
				// Subdomain/slug aktif adalah sumber kebenaran untuk konteks tenant.
				// X-Tenant-ID dari browser bisa stale saat user pindah tenant/subdomain,
				// jadi jangan diperlakukan sebagai header authoritative di sini.
				c.Set("tenantID", tenantID)
				c.Set("tenantSlug", slug)
				c.Next()
				return
			}
		}

		if headerTenantID != "" {
			c.Set("tenantID", headerTenantID)
			c.Next()
			return
		}

		if slug == "" {
			c.Next() // Biarkan route system/public lewat tanpa tenantID
			return
		}

		if !isPublicPath(c.Request.URL.Path) {
			c.AbortWithStatusJSON(404, gin.H{"error": "Bisnis tidak terdaftar"})
			return
		}
		c.Next()
	}
}

func lookupTenantIDBySlug(ctx context.Context, db *sqlx.DB, rdb *redis.Client, slug string) (string, error) {
	cacheKey := fmt.Sprintf("tenant_id_by_slug:%s", slug)
	id, err := rdb.Get(ctx, cacheKey).Result()
	if err == nil && id != "" {
		if id == missingTenantCacheValue {
			return "", sql.ErrNoRows
		}
		return id, nil
	}

	var dbID string
	err = db.GetContext(ctx, &dbID, "SELECT id FROM tenants WHERE LOWER(TRIM(slug)) = LOWER(TRIM($1)) LIMIT 1", slug)
	if err != nil || dbID == "" {
		if err == nil || err == sql.ErrNoRows {
			_ = rdb.Set(ctx, cacheKey, missingTenantCacheValue, 5*time.Minute).Err()
		}
		return "", err
	}

	_ = rdb.Set(ctx, cacheKey, dbID, 24*time.Hour).Err()
	return dbID, nil
}

func extractTenantSlug(c *gin.Context) string {
	candidates := []string{
		GetSlugFromHost(c.Request.Host),
		GetSlugFromHost(c.GetHeader("Origin")),
		GetSlugFromHost(c.GetHeader("Referer")),
	}

	for _, slug := range candidates {
		slug = normalizeSlug(slug)
		if slug != "" && !isSystemDomain(slug) && !isRootDomain(c.Request.Host, slug) {
			return slug
		}
	}
	return ""
}

func isRootDomain(host, slug string) bool {
	h := normalizeHost(host)
	if h == "" {
		return false
	}
	rootLike := map[string]bool{
		"bookinaja.com":   true,
		"bookinaja.local": true,
	}
	if rootLike[h] {
		return true
	}
	parts := strings.Split(h, ".")
	if len(parts) == 2 && parts[0] == slug {
		return true
	}
	return false
}

// --- HELPER FUNCTIONS ---

func GetSlugFromHost(host string) string {
	h := normalizeHost(host)
	if h == "" {
		return ""
	}
	if net.ParseIP(h) != nil {
		return ""
	}
	parts := strings.Split(h, ".")

	// Format: {slug}.bookinaja.local
	if len(parts) >= 3 {
		return parts[0]
	}
	return ""
}

func normalizeHost(value string) string {
	host := strings.TrimSpace(strings.ToLower(value))
	host = strings.TrimPrefix(host, "https://")
	host = strings.TrimPrefix(host, "http://")
	host = strings.Split(host, "/")[0]
	host = strings.Split(host, ":")[0]
	return host
}

func normalizeSlug(value string) string {
	return strings.TrimSpace(strings.ToLower(strings.Split(value, ".")[0]))
}

func isSystemDomain(slug string) bool {
	reserved := map[string]bool{
		"":          true,
		"api":       true,
		"www":       true,
		"localhost": true,
		"admin":     true,
	}
	return reserved[slug]
}

func isPublicPath(path string) bool {
	// Path yang diizinkan lewat tanpa tenantID yang valid
	return strings.Contains(path, "/public") ||
		strings.Contains(path, "/register") ||
		strings.Contains(path, "/ping")
}
