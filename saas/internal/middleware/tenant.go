package middleware

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	"github.com/redis/go-redis/v9"
)

func TenantIdentifier(db *sqlx.DB, rdb *redis.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 1. Prioritas 1: Cek Header X-Tenant-ID (Dari Axios/Next.js Cookie)
		tenantID := c.GetHeader("X-Tenant-ID")
		if tenantID != "" {
			c.Set("tenantID", tenantID)
			c.Next()
			return
		}

		// 2. Deteksi Slug dari Subdomain
		host := c.Request.Host // Contoh: api.bookinaja.local:8080 atau optimum.bookinaja.local:3000
		parts := strings.Split(host, ".")
		
		var slug string
		if len(parts) >= 3 {
			slug = parts[0] // Ambil bagian pertama (subdomain)
		}

		// --- FIX BREAKING POINT DI SINI ---
		// Jika request datang dari domain API utama, JANGAN cari tenant di DB/Redis.
		// Biarkan lewat (Next) agar Handler bisa pakai query param ?slug=...
		if slug == "" || slug == "api" || slug == "www" || slug == "localhost" {
			c.Next()
			return
		}

		// 3. Cek di Redis (Prioritas 2 - In-Memory Cache)
		ctx := c.Request.Context() // Gunakan context request
		cacheKey := fmt.Sprintf("tenant_id:%s", slug)
		val, err := rdb.Get(ctx, cacheKey).Result()
		
		if err == nil && val != "" {
			c.Set("tenantID", val)
			c.Next()
			return
		}

		// 4. Jika Redis Kosong, baru nanya Postgres (Last Resort)
		var id string
		err = db.Get(&id, "SELECT id FROM tenants WHERE slug = $1 LIMIT 1", slug)
		if err != nil || id == "" {
			// Jika slug tidak terdaftar di DB, kita jangan langsung abort jika ini path public landing
			// Tapi untuk keamanan multi-tenant lainnya, kita kasih error
			c.JSON(http.StatusNotFound, gin.H{"error": "Bisnis tidak terdaftar di sistem"})
			c.Abort()
			return
		}

		// 5. Simpan ke Redis (Expire 24 Jam)
		rdb.Set(ctx, cacheKey, id, 24*time.Hour)

		c.Set("tenantID", id)
		c.Next()
	}
}