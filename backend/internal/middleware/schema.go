package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/helwiza/backend/internal/platform/database"
	"github.com/jmoiron/sqlx"
)

func EnsureSchema(db *sqlx.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		if db == nil {
			c.Next()
			return
		}
		if err := database.EnsureCoreSchema(db.DB); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"error": "Database schema belum siap",
				"hint":  "Migration otomatis gagal dijalankan. Periksa log backend dan MIGRATION_PATH.",
			})
			c.Abort()
			return
		}
		c.Next()
	}
}
