package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// TenantIdentifier bertugas mengekstrak ID Tenant dari Header.
// Ini wajib dipasang di route public yang butuh konteks tenant (seperti Login Customer).
func TenantIdentifier() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 1. Coba ambil dari header X-Tenant-ID
		tenantID := c.GetHeader("X-Tenant-ID")

		// 2. Jika tidak ada, coba ambil dari X-Tenant-Slug (opsional jika kamu mau support slug)
		// tenantSlug := c.GetHeader("X-Tenant-Slug") 

		if tenantID == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Identitas bisnis (Tenant ID) tidak ditemukan di header",
			})
			c.Abort()
			return
		}

		// 3. Simpan ke context agar bisa diambil pakai c.MustGet("tenantID") di Handler
		c.Set("tenantID", tenantID)
		
		c.Next()
	}
}