package http

import (
	"context"
	stdhttp "net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/helwiza/backend/internal/middleware"
	"github.com/helwiza/backend/internal/platform/http/routecfg"
	guestrouter "github.com/helwiza/backend/internal/platform/http/router/guest"
	platformrouter "github.com/helwiza/backend/internal/platform/http/router/platform"
	protectedrouter "github.com/helwiza/backend/internal/platform/http/router/protected"
	publicrouter "github.com/helwiza/backend/internal/platform/http/router/public"
	rootrouter "github.com/helwiza/backend/internal/platform/http/router/root"
	"github.com/jmoiron/sqlx"
	"github.com/redis/go-redis/v9"
)

// NewRouter menginisialisasi router Gin dengan arsitektur Multi-Tenancy yang tajam.
func NewRouter(cfg routecfg.Config, db *sqlx.DB, rdb *redis.Client) *gin.Engine {
	r := gin.Default()
	r.MaxMultipartMemory = 100 << 20

	r.RedirectTrailingSlash = false
	r.RedirectFixedPath = false

	_ = r.SetTrustedProxies(resolveTrustedProxies())
	r.Use(middleware.CORSMiddleware())

	r.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "BATAM ENGINE ONLINE"})
	})
	r.GET("/health/live", func(c *gin.Context) {
		c.JSON(stdhttp.StatusOK, gin.H{"status": "ok"})
	})
	r.GET("/health/ready", func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
		defer cancel()

		if err := db.DB.PingContext(ctx); err != nil {
			c.JSON(stdhttp.StatusServiceUnavailable, gin.H{"status": "degraded", "dependency": "postgres"})
			return
		}
		if err := rdb.Ping(ctx).Err(); err != nil {
			c.JSON(stdhttp.StatusServiceUnavailable, gin.H{"status": "degraded", "dependency": "redis"})
			return
		}

		c.JSON(stdhttp.StatusOK, gin.H{"status": "ok"})
	})

	r.POST("/api/webhooks/midtrans", cfg.MidtransHandler.Webhook)
	platformrouter.RegisterPlatformRoutes(r, cfg)

	v1 := r.Group("/api/v1")
	v1.Use(middleware.EnsureSchema(db))
	v1.Use(middleware.TenantIdentifier(db, rdb))
	{
		if cfg.RealtimeHandler != nil {
			v1.GET("/realtime/ws", cfg.RealtimeHandler.ServeWS)
		}
		publicrouter.Register(v1, cfg)
		rootrouter.Register(v1, cfg)
		guestrouter.Register(v1, cfg)
		protectedrouter.Register(v1, cfg)
	}

	return r
}

func resolveTrustedProxies() []string {
	if raw := strings.TrimSpace(os.Getenv("TRUSTED_PROXIES")); raw != "" {
		parts := strings.Split(raw, ",")
		proxies := make([]string, 0, len(parts))
		for _, part := range parts {
			if proxy := strings.TrimSpace(part); proxy != "" {
				proxies = append(proxies, proxy)
			}
		}
		if len(proxies) > 0 {
			return proxies
		}
	}

	return []string{
		"127.0.0.1",
		"::1",
		"10.0.0.0/8",
		"172.16.0.0/12",
		"192.168.0.0/16",
	}
}
