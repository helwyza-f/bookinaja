package public

import (
	"github.com/gin-gonic/gin"
	"github.com/helwiza/backend/internal/platform/http/routecfg"
)

func Register(r *gin.RouterGroup, cfg routecfg.Config) {
	public := r.Group("/public")
	{
		public.GET("/tenant-id", cfg.TenantHandler.GetIDBySlug)
		public.GET("/tenants", cfg.TenantHandler.ListPublicTenants)
		public.GET("/discover/feed", cfg.TenantHandler.PublicDiscoverFeed)
		public.GET("/discover/posts/:id", cfg.TenantHandler.PublicDiscoveryPostDetail)
		public.POST("/discover/events", cfg.TenantHandler.TrackDiscoveryEvent)
		public.GET("/site", cfg.TenantHandler.GetPublicProfile)
		public.GET("/profile", cfg.TenantHandler.GetPublicProfile)
		public.GET("/landing", cfg.TenantHandler.GetPublicLandingData)
		public.GET("/resources", cfg.ResourceHandler.ListPublic)
		public.GET("/resources/:id", cfg.ResourceHandler.GetPublicDetail)
		public.GET("/fnb", cfg.FnbHandler.GetMenu)
		public.GET("/validate-phone", cfg.CustomerHandler.ValidatePhone)
		public.GET("/validate-customer", cfg.CustomerHandler.ValidateCustomer)
		public.GET("/bookings/:id", cfg.ReservationHandler.GetPublicDetailByToken)
		public.POST("/bookings", cfg.ReservationHandler.Create)
		public.POST("/promos/preview", cfg.PromoHandler.Preview)
		public.POST("/bookings/exchange", cfg.ReservationHandler.ExchangeAccessToken)
		public.GET("/payment-methods", cfg.BillingHandler.ListTenantPaymentMethods)
		public.POST("/sales-orders", cfg.SalesHandler.PublicCreate)
		public.POST("/sales-orders/exchange", cfg.SalesHandler.ExchangeAccessToken)
		public.POST("/bookings/:id/checkout", cfg.BillingHandler.BookingCheckout)
		public.POST("/bookings/:id/manual-payment", cfg.BillingHandler.SubmitManualBookingPayment)
		public.POST("/bookings/:id/sync", cfg.ReservationHandler.SyncSession)
		public.POST("/devices/pair", cfg.SmartDeviceHandler.Pair)
		public.POST("/customer/login", cfg.CustomerHandler.RequestOTP)
		public.POST("/customer/login-email", cfg.CustomerHandler.CustomerLoginEmail)
		public.POST("/customer/google/login", cfg.CustomerHandler.CustomerGoogleLogin)
		public.POST("/customer/google/claim", cfg.CustomerHandler.CustomerGoogleClaim)
		public.POST("/customer/password/reset/request", cfg.CustomerHandler.RequestPasswordResetOTP)
		public.POST("/customer/password/reset/verify", cfg.CustomerHandler.VerifyPasswordResetOTP)
		public.POST("/customer/register", cfg.CustomerHandler.CustomerRegister)
		public.POST("/customer/register/claim", cfg.CustomerHandler.CustomerClaimAccount)
		public.POST("/customer/register/resend", cfg.CustomerHandler.ResendRegistrationOTP)
		public.POST("/customer/verify", cfg.CustomerHandler.VerifyOTP)
	}
}
