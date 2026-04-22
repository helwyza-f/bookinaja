package router

import (
	"github.com/gin-gonic/gin"
	"github.com/helwiza/saas/internal/platform/http/routecfg"
)

func RegisterPlatformRoutes(r *gin.Engine, cfg routecfg.Config) {
	platform := r.Group("/api/v1/platform")
	{
		platform.POST("/login", cfg.PlatformHandler.Login)
	}
}
