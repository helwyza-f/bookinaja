package root

import (
	"github.com/gin-gonic/gin"
	"github.com/helwiza/backend/internal/platform/http/routecfg"
)

func Register(r *gin.RouterGroup, cfg routecfg.Config) {
	r.POST("/register", cfg.TenantHandler.Register)
	r.POST("/login", cfg.TenantHandler.Login)
}
