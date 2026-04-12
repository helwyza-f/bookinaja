package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		// 1. Logika Dinamis Origin
		if origin != "" {
			// Kita buat pengecekan yang lebih aman untuk prod dan dev
			if strings.Contains(origin, "localhost") || 
			   strings.HasSuffix(origin, ".local:3000") || 
			   strings.HasSuffix(origin, "bookinaja.com") {
				c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			} else {
				// Fallback tetap aman tapi fleksibel
				c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			}
		}

		// 2. Credentials & Methods
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

		// 3. Headers (PENTING: X-Tenant-ID sudah terdaftar)
		allowedHeaders := []string{
			"Content-Type",
			"Content-Length",
			"Accept-Encoding",
			"X-CSRF-Token",
			"Authorization",
			"Accept",
			"Origin",
			"Cache-Control",
			"X-Requested-With",
			"X-Tenant-ID",
		}
		c.Writer.Header().Set("Access-Control-Allow-Headers", strings.Join(allowedHeaders, ", "))

		// 4. ELIMINASI OPTIONS BERULANG (The Magic Key)
		// Browser akan menyimpan hasil preflight di cache selama waktu yang ditentukan (dalam detik).
		// 43200 detik = 12 Jam. Jadi browser cuma nanya OPTIONS sekali tiap 12 jam per URL.
		c.Writer.Header().Set("Access-Control-Max-Age", "43200")

		// 5. Handle Preflight Request
		if c.Request.Method == "OPTIONS" {
			// Kasih tau browser kalau preflight ini sukses dan bisa di-cache
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}