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
		// Mengizinkan localhost, domain .local (untuk dev laptop baru), dan domain produksi
		if origin != "" {
			if strings.Contains(origin, "localhost") || 
			   strings.HasSuffix(origin, ".local:3000") || 
			   strings.HasSuffix(origin, "bookinaja.com") {
				c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			} else {
				// Fallback untuk development agar tidak pusing CORS
				c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			}
		}

		// 2. Credentials & Methods
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		// 3. Headers (PENTING: Tambahkan X-Tenant-ID di sini!)
		// Jika X-Tenant-ID tidak ada di sini, browser akan memblokir request saat kita kirim custom header tersebut
		allowedHeaders := []string{
			"Content-Type",
			"Content-Length",
			"Accept-Encoding",
			"X-CSRF-Token",
			"Authorization",
			"accept",
			"origin",
			"Cache-Control",
			"X-Requested-With",
			"X-Tenant-ID", // <--- WAJIB ADA INI
		}
		c.Writer.Header().Set("Access-Control-Allow-Headers", strings.Join(allowedHeaders, ", "))

		// 4. Handle Preflight Request
		// Browser akan mengirimkan request OPTIONS sebelum POST/PUT yang sesungguhnya
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}