package http

import (
	"github.com/gin-gonic/gin"
	"github.com/helwiza/saas/internal/auth"
	"github.com/helwiza/saas/internal/customer"
	"github.com/helwiza/saas/internal/fnb"
	"github.com/helwiza/saas/internal/middleware"
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
}

// NewRouter menginisialisasi router Gin dengan arsitektur Multi-Tenancy
func NewRouter(cfg Config, db *sqlx.DB, rdb *redis.Client) *gin.Engine {
	r := gin.Default()

	// Konfigurasi Standar
	r.RedirectTrailingSlash = false
	r.RedirectFixedPath = false

	// --- GLOBAL MIDDLEWARES ---
	r.Use(middleware.CORSMiddleware())
	r.Use(gin.Recovery())
	r.Use(gin.Logger())

	// Health Check
	r.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "BATAM ENGINE ONLINE"})
	})

	// API v1 Group
	v1 := r.Group("/api/v1")

	// MIDDLEWARE UTAMA: Identifikasi Tenant berdasarkan Header/Subdomain/Query
	v1.Use(middleware.TenantIdentifier(db, rdb))
	{
		// --- 1. PUBLIC ROUTES (Optimized & Granular) ---
		public := v1.Group("/public")
		{
			// Identifier Path
			public.GET("/tenant-id", cfg.TenantHandler.GetIDBySlug)
			
			// Profile & Content (Jalur Cepat Landing)
			public.GET("/profile", cfg.TenantHandler.GetPublicProfile) // Baru: Hanya profile & tema
			public.GET("/landing", cfg.TenantHandler.GetPublicLandingData) // Legacy: Tetap ada jika butuh full data
			
			// Catalog Data (Bisa di-load paralel/lazy load)
			public.GET("/resources", cfg.ResourceHandler.ListPublic) // Baru: List unit
			public.GET("/resources/:id", cfg.ResourceHandler.GetPublicDetail)
			public.GET("/fnb", cfg.FnbHandler.GetMenu)

			// Reservation Flow
			public.GET("/bookings/:id", cfg.ReservationHandler.GetDetail)
			public.POST("/bookings", cfg.ReservationHandler.Create)

			// Customer Self-Auth (WhatsApp Flow)
			public.GET("/validate-phone", cfg.CustomerHandler.ValidatePhone)
			public.POST("/customer/login", cfg.CustomerHandler.RequestOTP)
			public.POST("/customer/verify", cfg.CustomerHandler.VerifyOTP)
		}

		// Auth Dasar (Admin & Owner)
		v1.POST("/register", cfg.TenantHandler.Register)
		v1.POST("/login", cfg.TenantHandler.Login)

		// --- 2. GUEST ROUTES (Magic Token) ---
		guest := v1.Group("/guest")
		{
			guest.GET("/availability/:resource_id", cfg.ReservationHandler.Availability)
			guest.GET("/status/:token", cfg.ReservationHandler.Status)
		}

		// --- 3. PROTECTED ROUTES (Butuh JWT) ---
		protected := v1.Group("/")
		protected.Use(middleware.AuthMiddleware())
		{
			// --- CUSTOMER PORTAL AREA (/me) ---
			me := protected.Group("/me")
			{
				me.GET("", cfg.CustomerHandler.GetMe)
				me.GET("/bookings/:id", cfg.ReservationHandler.GetDetail)
			}

			// --- ADMIN & POS MANAGEMENT AREA (Staff Only) ---
			adminArea := protected.Group("/")
			adminArea.Use(middleware.AdminOnly())
			{
				// Business Settings
				admin := adminArea.Group("/admin")
				{
					admin.GET("/profile", cfg.TenantHandler.GetProfile)
					admin.PUT("/profile", cfg.TenantHandler.UpdateProfile)
					admin.POST("/upload", func(c *gin.Context) {
						HandleSingleUpload(c, "tenants")
					})
				}

				// Resource & Unit Inventory
				resources := adminArea.Group("/resources-all")
				{
					resources.GET("", cfg.ResourceHandler.List)
					resources.GET("/:id", cfg.ResourceHandler.GetByID)
					resources.POST("", cfg.ResourceHandler.Create)
					resources.PUT("/:id", cfg.ResourceHandler.Update)
					resources.DELETE("/:id", cfg.ResourceHandler.Delete)

					resources.GET("/:id/items", cfg.ResourceHandler.ListItems)
					resources.POST("/:id/items", cfg.ResourceHandler.AddItem)
					resources.PUT("/items/:id", cfg.ResourceHandler.UpdateItem)
					resources.DELETE("/items/:id", cfg.ResourceHandler.DeleteItem)

					resources.POST("/upload-cover", func(c *gin.Context) {
						HandleSingleUpload(c, "resources/covers")
					})
				}

				// POS & Reservation System
				bookings := adminArea.Group("/bookings")
				{
					bookings.GET("", cfg.ReservationHandler.ListAll)
					bookings.GET("/:id", cfg.ReservationHandler.GetDetail)
					bookings.PUT("/:id/status", cfg.ReservationHandler.UpdateStatus)
					bookings.POST("/manual", cfg.ReservationHandler.Create)

					bookings.GET("/pos/active", cfg.ReservationHandler.GetActiveSessions)
					bookings.POST("/pos/order/:id", cfg.ReservationHandler.AddOrder)
					bookings.POST("/:id/extend", cfg.ReservationHandler.ExtendSession)
					bookings.POST("/:id/addons", cfg.ReservationHandler.AddAddonItem)
				}

				// Food & Beverage Menu
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

				// CRM & Analytics
				customers := adminArea.Group("/customers")
				{
					customers.GET("", cfg.CustomerHandler.List)
					customers.GET("/:id", cfg.CustomerHandler.GetByID)
					customers.GET("/search", cfg.CustomerHandler.SearchByPhone)
				}

				adminArea.GET("/auth/me", cfg.AuthHandler.CheckMe)
			}
		}
	}

	return r
}