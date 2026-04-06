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

// NewRouter menginisialisasi router Gin dengan middleware multi-tenancy berbasis Redis & DB
func NewRouter(cfg Config, db *sqlx.DB, rdb *redis.Client) *gin.Engine {
	r := gin.Default()

	// Konfigurasi Router Dasar
	r.RedirectTrailingSlash = false
	r.RedirectFixedPath = false

	// --- GLOBAL MIDDLEWARES ---
	r.Use(middleware.CORSMiddleware())
	r.Use(gin.Recovery())
	r.Use(gin.Logger())

	// Health Check
	r.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "pong"})
	})

	// API Group v1
	v1 := r.Group("/api/v1")
	
	// MIDDLEWARE KRUSIAL: Identifikasi Tenant (Subdomain/Header)
	// Semua request di bawah grup ini wajib lolos identifikasi tenant
	v1.Use(middleware.TenantIdentifier(db, rdb)) 
	{
		// --- 1. PUBLIC ROUTES (Akses tanpa login untuk Customer/Landing) ---
		public := v1.Group("/public")
		{
			public.GET("/landing", cfg.TenantHandler.GetPublicLandingData)
			public.GET("/resources/:id", cfg.ResourceHandler.GetPublicDetail)
			public.POST("/bookings", cfg.ReservationHandler.Create)
			public.GET("/fnb", cfg.FnbHandler.GetMenu)
			
			// Customer Auth Flow (WhatsApp OTP)
			public.GET("/validate-phone", cfg.CustomerHandler.ValidatePhone)
			public.POST("/customer/login", cfg.CustomerHandler.RequestOTP)
			public.POST("/customer/verify", cfg.CustomerHandler.VerifyOTP)
		}

		// Admin/Tenant Platform Auth (Register & Login Owner)
		v1.POST("/register", cfg.TenantHandler.Register)
		v1.POST("/login", cfg.TenantHandler.Login)

		// --- 2. GUEST ROUTES (Akses via Magic Link / Token) ---
		guest := v1.Group("/guest")
		{
			guest.GET("/availability/:resource_id", cfg.ReservationHandler.Availability)
			guest.GET("/status/:token", cfg.ReservationHandler.Status)
		}

		// --- 3. PROTECTED ROUTES (Membutuhkan Validasi JWT) ---
		protected := v1.Group("/")
		protected.Use(middleware.AuthMiddleware()) 
		{
			// --- CUSTOMER AREA ---
			me := protected.Group("/me")
			{
				me.GET("", cfg.CustomerHandler.GetMe) 
			}

			// --- ADMIN & STAFF AREA (Internal Management) ---
			adminArea := protected.Group("/")
			adminArea.Use(middleware.AdminOnly()) 
			{
				// Business Profile
				admin := adminArea.Group("/admin")
				{
					admin.GET("/profile", cfg.TenantHandler.GetProfile)
					admin.PUT("/profile", cfg.TenantHandler.UpdateProfile)
					admin.POST("/upload", func(c *gin.Context) {
						HandleSingleUpload(c, "tenants")
					})
				}

				// Resource & Unit Management
				resources := adminArea.Group("/resources-all")
				{
					resources.GET("", cfg.ResourceHandler.List)
					resources.POST("", cfg.ResourceHandler.Create)
					resources.PUT("/:id", cfg.ResourceHandler.Update)
					resources.DELETE("/:id", cfg.ResourceHandler.Delete)

					resources.POST("/upload-cover", func(c *gin.Context) {
						HandleSingleUpload(c, "resources/covers")
					})
					resources.POST("/upload-gallery", func(c *gin.Context) {
						HandleBulkUpload(c, "resources/gallery")
					})

					resources.GET("/:id/items", cfg.ResourceHandler.ListItems)
					resources.POST("/:id/items", cfg.ResourceHandler.AddItem)
					resources.PUT("/items/:id", cfg.ResourceHandler.UpdateItem)
					resources.DELETE("/items/:id", cfg.ResourceHandler.DeleteItem)
				}

				// Food & Beverage Management
				fnbGroup := adminArea.Group("/fnb")
				{
					fnbGroup.GET("", cfg.FnbHandler.GetMenu)
					fnbGroup.POST("", cfg.FnbHandler.CreateItem)
					fnbGroup.PUT("/:id", cfg.FnbHandler.UpdateItem)
					fnbGroup.DELETE("/:id", cfg.FnbHandler.DeleteItem)
					fnbGroup.POST("/upload", func(c *gin.Context) {
						HandleSingleUpload(c, "fnb/items")
					})
				}

				// Reservation & POS System
				bookings := adminArea.Group("/bookings")
				{
					bookings.GET("", cfg.ReservationHandler.ListAll)
					bookings.GET("/:id", cfg.ReservationHandler.GetDetail)
					bookings.PUT("/:id/status", cfg.ReservationHandler.UpdateStatus)
					bookings.POST("/manual", cfg.ReservationHandler.Create)

					// POS Session Control
					bookings.GET("/pos/active", cfg.ReservationHandler.GetActiveSessions)
					bookings.POST("/pos/order/:id", cfg.ReservationHandler.AddOrder)
					bookings.POST("/:id/extend", cfg.ReservationHandler.ExtendSession)
					bookings.POST("/:id/addons", cfg.ReservationHandler.AddAddonItem)
				}

				// Customer CRM Management
				customers := adminArea.Group("/customers")
				{
					customers.GET("", cfg.CustomerHandler.List)
					customers.POST("", cfg.CustomerHandler.Create)
					customers.GET("/:id", cfg.CustomerHandler.GetByID)
					customers.GET("/search", cfg.CustomerHandler.SearchByPhone)
				}

				// Auth Check for UI State
				adminArea.GET("/auth/me", cfg.AuthHandler.CheckMe)
			}
		}
	}

	return r
}