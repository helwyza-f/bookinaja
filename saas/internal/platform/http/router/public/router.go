package public

import (
	"github.com/gin-gonic/gin"
	"github.com/helwiza/saas/internal/platform/http/routecfg"
)

func Register(r *gin.RouterGroup, cfg routecfg.Config) {
	public := r.Group("/public")
	{
		public.GET("/tenant-id", cfg.TenantHandler.GetIDBySlug)
		public.GET("/tenants", cfg.TenantHandler.ListPublicTenants)
		public.GET("/profile", cfg.TenantHandler.GetPublicProfile)
		public.GET("/landing", cfg.TenantHandler.GetPublicLandingData)
		public.GET("/resources", cfg.ResourceHandler.ListPublic)
		public.GET("/resources/:id", cfg.ResourceHandler.GetPublicDetail)
		public.GET("/fnb", cfg.FnbHandler.GetMenu)
		public.GET("/validate-phone", cfg.CustomerHandler.ValidatePhone)
		public.GET("/validate-customer", cfg.CustomerHandler.ValidateCustomer)
		public.GET("/bookings/:id", cfg.ReservationHandler.GetPublicDetailByToken)
		public.POST("/bookings", cfg.ReservationHandler.Create)
		public.POST("/bookings/exchange", cfg.ReservationHandler.ExchangeAccessToken)
		public.POST("/bookings/:id/checkout", cfg.BillingHandler.BookingCheckout)
		public.POST("/bookings/:id/sync", cfg.ReservationHandler.SyncSession)
		public.POST("/customer/login", cfg.CustomerHandler.RequestOTP)
		public.POST("/customer/verify", cfg.CustomerHandler.VerifyOTP)
	}
}
