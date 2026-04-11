package middleware

import (
	"fmt"

	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	"github.com/redis/go-redis/v9"
)

// TenantIdentifier mendeteksi siapa pemilik resource berdasarkan konteks request.
func TenantIdentifier(db *sqlx.DB, rdb *redis.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 1. Cek Header (ID UUID) - Jalur paling efisien
		tenantID := c.GetHeader("X-Tenant-ID")
		if tenantID != "" {
			c.Set("tenantID", tenantID)
			c.Next()
			return
		}

		// 2. Cek Slug (Bisa dari Subdomain atau Query Param dari config.params frontend)
		slug := GetSlugFromHost(c.Request.Host)
		if slug == "" || isSystemDomain(slug) {
			slug = c.Query("slug") 
		}

		if slug == "" {
			c.Next() // Biarkan route system/public lewat tanpa tenantID
			return
		}

		// 3. Redis Cache Lookup (Mapping Slug -> ID)
		// Jalur ini cuma makan waktu ~4ms
		ctx := c.Request.Context()
		cacheKey := fmt.Sprintf("tenant_id_by_slug:%s", slug)
		id, err := rdb.Get(ctx, cacheKey).Result()
		
		if err == nil && id != "" {
			c.Set("tenantID", id)
			c.Next()
			return
		}

		// 4. DB Lookup (Hanya jika Cache Miss)
		var dbID string
		err = db.Get(&dbID, "SELECT id FROM tenants WHERE slug = $1 LIMIT 1", slug)
		if err != nil || dbID == "" {
			if !isPublicPath(c.Request.URL.Path) {
				c.AbortWithStatusJSON(404, gin.H{"error": "Bisnis tidak terdaftar"})
				return
			}
			c.Next()
			return
		}

		// Sync ke Redis biar next request cuma makan 4ms
		rdb.Set(ctx, cacheKey, dbID, 24*time.Hour)
		c.Set("tenantID", dbID)
		c.Next()
	}
}

// --- HELPER FUNCTIONS ---

func GetSlugFromHost(host string) string {
	// Bersihkan port jika ada (localhost:8080 -> localhost)
	h := strings.Split(host, ":")[0]
	parts := strings.Split(h, ".")
	
	// Format: {slug}.bookinaja.local
	if len(parts) >= 3 {
		return parts[0]
	}
	return ""
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