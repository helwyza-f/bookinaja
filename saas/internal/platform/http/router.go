package http

import (
	"github.com/gin-gonic/gin"
	"github.com/helwiza/saas/internal/auth"
	"github.com/helwiza/saas/internal/billing"
	"github.com/helwiza/saas/internal/customer"
	"github.com/helwiza/saas/internal/fnb"
	"github.com/helwiza/saas/internal/middleware"
	"github.com/helwiza/saas/internal/platformadmin"
	"github.com/helwiza/saas/internal/reservation"
	"github.com/helwiza/saas/internal/resource"
	"github.com/helwiza/saas/internal/tenant"
	"github.com/jmoiron/sqlx"
	"github.com/redis/go-redis/v9"
)

type Config struct {
	TenantHandler      *tenant.Handler
	ResourceHandler    *resource.Handler
	ReservationHandler *reservation.Handler
	CustomerHandler    *customer.Handler
	AuthHandler        *auth.Handler
	FnbHandler         *fnb.Handler
	BillingHandler     *billing.Handler
	PlatformHandler    *platformadmin.Handler
}

// NewRouter menginisialisasi router Gin dengan arsitektur Multi-Tenancy yang tajam.
func NewRouter(cfg Config, db *sqlx.DB, rdb *redis.Client) *gin.Engine {
	r := gin.Default()

	// Konfigurasi Standar Engine
	r.RedirectTrailingSlash = false
	r.RedirectFixedPath = false

	// --- GLOBAL MIDDLEWARES ---
	r.Use(middleware.CORSMiddleware())
	r.Use(gin.Recovery())
	r.Use(gin.Logger())

	// Health Check & Engine Pulse
	r.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "BATAM ENGINE ONLINE"})
	})

	// Webhooks (no auth)
	r.POST("/api/webhooks/midtrans", cfg.BillingHandler.MidtransWebhook)

	platform := r.Group("/api/v1/platform")
	{
		platform.POST("/login", cfg.PlatformHandler.Login)
	}

	// API v1 Group
	v1 := r.Group("/api/v1")

	// MIDDLEWARE UTAMA: Identifikasi Tenant (Wajib ada buat semua route di bawah ini)
	v1.Use(middleware.TenantIdentifier(db, rdb))
	{
		// --- 1. PUBLIC ROUTES (No Login Required) ---
		// Digunakan oleh Landing Page & Boking Page Public
		public := v1.Group("/public")
		{
			// Tenant Identity
			public.GET("/tenant-id", cfg.TenantHandler.GetIDBySlug)
			public.GET("/profile", cfg.TenantHandler.GetPublicProfile)
			public.GET("/landing", cfg.TenantHandler.GetPublicLandingData)

			// Catalog & Discovery
			public.GET("/resources", cfg.ResourceHandler.ListPublic)
			public.GET("/resources/:id", cfg.ResourceHandler.GetPublicDetail)
			public.GET("/fnb", cfg.FnbHandler.GetMenu)

			// Fast Boking Flow & Validation
			public.GET("/validate-phone", cfg.CustomerHandler.ValidatePhone)
			public.GET("/validate-customer", cfg.CustomerHandler.ValidateCustomer) // Baru: Check if returning customer
			public.GET("/bookings/:id", cfg.ReservationHandler.GetPublicDetailByToken)
			public.POST("/bookings", cfg.ReservationHandler.Create)
			public.POST("/bookings/exchange", cfg.ReservationHandler.ExchangeAccessToken)
			public.POST("/bookings/:id/checkout", cfg.BillingHandler.BookingCheckout)
			public.POST("/bookings/:id/sync", cfg.ReservationHandler.SyncSession)

			// Customer Self-Auth (WhatsApp OTP)
			public.POST("/customer/login", cfg.CustomerHandler.RequestOTP)
			public.POST("/customer/verify", cfg.CustomerHandler.VerifyOTP)
		}

		// Auth Dasar (Admin Login & Registration)
		v1.POST("/register", cfg.TenantHandler.Register)
		v1.POST("/login", cfg.TenantHandler.Login)

		// --- 2. GUEST ROUTES (Magic Link / Ticket Token Access) ---
		guest := v1.Group("/guest")
		{
			guest.GET("/availability/:resource_id", cfg.ReservationHandler.Availability)
			guest.GET("/status/:token", cfg.ReservationHandler.Status)
		}

		// --- 3. PROTECTED ROUTES (JWT Token Required) ---
		protected := v1.Group("/")
		protected.Use(middleware.AuthMiddleware())
		{
			platformProtected := protected.Group("/platform")
			platformProtected.Use(middleware.PlatformOnly())
			{
				platformProtected.GET("/me", cfg.PlatformHandler.Me)
				platformProtected.GET("/summary", cfg.PlatformHandler.Summary)
				platformProtected.GET("/revenue", cfg.PlatformHandler.Revenue)
				platformProtected.GET("/revenue/breakdown", cfg.PlatformHandler.RevenueBreakdown)
				platformProtected.GET("/revenue/timeseries", cfg.PlatformHandler.RevenueTimeseries)
				platformProtected.GET("/revenue/export", cfg.PlatformHandler.RevenueCSV)
				platformProtected.GET("/tenants", cfg.PlatformHandler.Tenants)
				platformProtected.GET("/tenants/:tenant_id", cfg.PlatformHandler.TenantDetail)
				platformProtected.GET("/tenants/:tenant_id/customers", cfg.PlatformHandler.TenantCustomers)
				platformProtected.GET("/tenants/:tenant_id/transactions", cfg.PlatformHandler.TenantTransactions)
				platformProtected.GET("/tenants/:tenant_id/balance", cfg.PlatformHandler.TenantBalanceDetail)
				platformProtected.GET("/tenants/:tenant_id/notif-history", cfg.PlatformHandler.TenantMidtransNotifications)
				platformProtected.GET("/customers", cfg.PlatformHandler.Customers)
				platformProtected.GET("/transactions", cfg.PlatformHandler.Transactions)
				platformProtected.GET("/midtrans-notifications", cfg.PlatformHandler.MidtransNotifications)
			}

			// --- CUSTOMER PORTAL AREA (/me) ---
			// Khusus untuk customer yang login via OTP
			me := protected.Group("/me")
			{
				me.GET("", cfg.CustomerHandler.GetMe)
				me.GET("/bookings/:id", cfg.ReservationHandler.GetMyDetail)
			}

			customerArea := protected.Group("/customer")
			{
				customerArea.GET("/resources", cfg.ReservationHandler.GetCustomerResources)
				customerArea.GET("/fnb", cfg.ReservationHandler.GetCustomerFnb)
				customerArea.GET("/bookings/:id", cfg.ReservationHandler.GetMyDetail)
				customerArea.GET("/bookings/:id/context", cfg.ReservationHandler.GetCustomerLiveSnapshot)
				customerArea.GET("/bookings/:id/availability", cfg.ReservationHandler.CustomerBookingAvailability)
				customerArea.POST("/bookings/:id/extend", cfg.ReservationHandler.CustomerExtendSession)
				customerArea.POST("/bookings/:id/orders", cfg.ReservationHandler.CustomerAddOrder)
				customerArea.POST("/bookings/:id/addons", cfg.ReservationHandler.CustomerAddAddonItem)
			}

			// --- ADMIN & POS MANAGEMENT AREA (Staff Only) ---
			adminArea := protected.Group("/")
			adminArea.Use(middleware.AdminOnly())
			{
				// Core Admin Pulse
				adminArea.GET("/auth/me", cfg.AuthHandler.CheckMe)

				// Subscription & Billing
				billingGroup := adminArea.Group("/billing")
				{
					billingGroup.GET("/subscription", cfg.BillingHandler.GetSubscription)
					billingGroup.GET("/orders", cfg.BillingHandler.ListOrders)
					billingGroup.POST("/checkout", cfg.BillingHandler.Checkout)
					billingGroup.POST("/bookings/checkout", cfg.BillingHandler.BookingCheckout)
				}

				// Business Profile Settings
				admin := adminArea.Group("/admin")
				{
					admin.GET("/profile", cfg.TenantHandler.GetProfile)
					admin.PUT("/profile", cfg.TenantHandler.UpdateProfile)
					admin.POST("/upload", func(c *gin.Context) {
						HandleSingleUpload(c, "tenants")
					})
				}

				// Inventory & Unit Configuration
				resources := adminArea.Group("/resources-all")
				{
					resources.GET("", cfg.ResourceHandler.List)
					resources.GET("/:id", cfg.ResourceHandler.GetByID)
					resources.POST("", cfg.ResourceHandler.Create)
					resources.PUT("/:id", cfg.ResourceHandler.Update)
					resources.DELETE("/:id", cfg.ResourceHandler.Delete)

					// Sub-items (Rates/Packages)
					resources.GET("/:id/items", cfg.ResourceHandler.ListItems)
					resources.POST("/:id/items", cfg.ResourceHandler.AddItem)
					resources.PUT("/items/:id", cfg.ResourceHandler.UpdateItem)
					resources.DELETE("/items/:id", cfg.ResourceHandler.DeleteItem)

					// Media Management
					resources.POST("/upload-cover", func(c *gin.Context) {
						HandleSingleUpload(c, "resources/covers")
					})
					resources.POST("/upload-gallery", func(c *gin.Context) {
						HandleBulkUpload(c, "resources/gallery")
					})
				}

				// POS & Real-time Session Monitoring
				bookings := adminArea.Group("/bookings")
				{
					bookings.GET("", cfg.ReservationHandler.ListAll)
					bookings.GET("/:id", cfg.ReservationHandler.GetDetail)
					bookings.PUT("/:id/status", cfg.ReservationHandler.UpdateStatus)
					bookings.POST("/:id/settle-cash", cfg.ReservationHandler.SettleCash)
					bookings.POST("/manual", cfg.ReservationHandler.Create)

					// POS Engine Endpoints
					bookings.GET("/pos/active", cfg.ReservationHandler.GetActiveSessions)
					bookings.POST("/pos/order/:id", cfg.ReservationHandler.AddOrder)
					bookings.POST("/:id/extend", cfg.ReservationHandler.ExtendSession)
					bookings.POST("/:id/addons", cfg.ReservationHandler.AddAddonItem)
				}

				// Food & Beverage Catalog
				fnbGroup := adminArea.Group("/fnb")
				{
					fnbGroup.GET("", cfg.FnbHandler.GetMenu)
					fnbGroup.POST("", cfg.FnbHandler.CreateItem)
					fnbGroup.PUT("/:id", cfg.FnbHandler.UpdateItem)
					fnbGroup.DELETE("/:id", cfg.FnbHandler.DeleteItem)
					fnbGroup.POST("/upload", func(c *gin.Context) {
						HandleSingleUpload(c, "fnb")
					})
				}

				// CRM & Loyalty Management
				customers := adminArea.Group("/customers")
				{
					customers.GET("", cfg.CustomerHandler.List)
					customers.GET("/search", cfg.CustomerHandler.SearchByPhone)
					customers.GET("/:id/history", cfg.CustomerHandler.GetHistory)
					customers.GET("/:id", cfg.CustomerHandler.GetByID)
				}
			}
		}
	}

	return r
}
