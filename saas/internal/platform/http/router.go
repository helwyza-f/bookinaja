package http

import (
	"github.com/gin-gonic/gin"
	"github.com/helwiza/saas/internal/middleware"
	"github.com/helwiza/saas/internal/platform/http/routecfg"
	guestrouter "github.com/helwiza/saas/internal/platform/http/router/guest"
	platformrouter "github.com/helwiza/saas/internal/platform/http/router/platform"
	protectedrouter "github.com/helwiza/saas/internal/platform/http/router/protected"
	publicrouter "github.com/helwiza/saas/internal/platform/http/router/public"
	rootrouter "github.com/helwiza/saas/internal/platform/http/router/root"
	"github.com/jmoiron/sqlx"
	"github.com/redis/go-redis/v9"
)

// NewRouter menginisialisasi router Gin dengan arsitektur Multi-Tenancy yang tajam.
func NewRouter(cfg routecfg.Config, db *sqlx.DB, rdb *redis.Client) *gin.Engine {
	r := gin.Default()

	r.RedirectTrailingSlash = false
	r.RedirectFixedPath = false

	r.Use(middleware.CORSMiddleware())
	r.Use(gin.Recovery())
	r.Use(gin.Logger())

	r.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "BATAM ENGINE ONLINE"})
	})

	r.POST("/api/webhooks/midtrans", cfg.BillingHandler.MidtransWebhook)
	platformrouter.RegisterPlatformRoutes(r, cfg)

	v1 := r.Group("/api/v1")
	v1.Use(middleware.TenantIdentifier(db, rdb))
	{
		publicrouter.Register(v1, cfg)
		rootrouter.Register(v1, cfg)
		guestrouter.Register(v1, cfg)
		protectedrouter.Register(v1, cfg)
	}

	return r
}
