package guest

import (
	"github.com/gin-gonic/gin"
	"github.com/helwiza/backend/internal/platform/http/routecfg"
)

func Register(r *gin.RouterGroup, cfg routecfg.Config) {
	guest := r.Group("/guest")
	{
		guest.GET("/availability/:resource_id", cfg.ReservationHandler.Availability)
		guest.GET("/status/:token", cfg.ReservationHandler.Status)
	}
}
