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
)

type Config struct {
	TenantHandler      *tenant.Handler
	ResourceHandler    *resource.Handler
	ReservationHandler *reservation.Handler
	CustomerHandler    *customer.Handler
	AuthHandler        *auth.Handler
	FnbHandler         *fnb.Handler
}

func NewRouter(cfg Config) *gin.Engine {
	r := gin.Default()

	r.RedirectTrailingSlash = false
	r.RedirectFixedPath = false

	r.Use(middleware.CORSMiddleware())
	r.Use(gin.Recovery())
	r.Use(gin.Logger())

	r.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "pong"})
	})

	v1 := r.Group("/api/v1")
	{
		// --- PUBLIC ROUTES (No Auth Required) ---
		v1.GET("/public/landing", cfg.TenantHandler.GetPublicLandingData)
		v1.GET("/public/resources/:id", cfg.ResourceHandler.GetPublicDetail)
		v1.POST("/public/bookings", cfg.ReservationHandler.Create)
		v1.GET("/public/fnb", cfg.FnbHandler.GetMenu)
		v1.GET("/validate-phone", cfg.CustomerHandler.ValidatePhone)

		v1.POST("/register", cfg.TenantHandler.Register)
		v1.POST("/login", cfg.TenantHandler.Login)

		// --- GUEST ROUTES (Magic Link Access) ---
		guest := v1.Group("/guest")
		{
			guest.GET("/availability/:resource_id", cfg.ReservationHandler.Availability)
			guest.GET("/status/:token", cfg.ReservationHandler.Status)
		}

		// --- PROTECTED ROUTES (Admin/Tenant Only) ---
		protected := v1.Group("/")
		protected.Use(middleware.AuthMiddleware())
		{
			// Admin Profile & Settings
			admin := protected.Group("/admin")
			{
				admin.GET("/profile", cfg.TenantHandler.GetProfile)
				admin.PUT("/profile", cfg.TenantHandler.UpdateProfile)

				admin.POST("/upload", func(c *gin.Context) {
					HandleSingleUpload(c, "tenants")
				})
			}

			// RESOURCE MANAGEMENT
			resources := protected.Group("/resources-all")
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

			// F&B MANAGEMENT
			fnbGroup := protected.Group("/fnb")
			{
				fnbGroup.GET("", cfg.FnbHandler.GetMenu)
				fnbGroup.POST("", cfg.FnbHandler.CreateItem)
				fnbGroup.PUT("/:id", cfg.FnbHandler.UpdateItem)
				fnbGroup.DELETE("/:id", cfg.FnbHandler.DeleteItem)

				fnbGroup.POST("/upload", func(c *gin.Context) {
					HandleSingleUpload(c, "fnb/items")
				})
			}

			// BOOKING & POS MANAGEMENT
			bookings := protected.Group("/bookings")
			{
				bookings.GET("", cfg.ReservationHandler.ListAll)
				bookings.GET("/:id", cfg.ReservationHandler.GetDetail)
				bookings.PUT("/:id/status", cfg.ReservationHandler.UpdateStatus)
				bookings.POST("/manual", cfg.ReservationHandler.Create)

				// --- POS SPECIFIC ROUTES ---
				bookings.GET("/pos/active", cfg.ReservationHandler.GetActiveSessions)
				bookings.POST("/pos/order/:id", cfg.ReservationHandler.AddOrder)

				// --- POS CONTROL HUB ---
				bookings.POST("/:id/extend", cfg.ReservationHandler.ExtendSession)
				bookings.POST("/:id/addons", cfg.ReservationHandler.AddAddonItem)
			}

			// CUSTOMER MANAGEMENT (CRM)
			customers := protected.Group("/customers")
			{
				// GET /api/v1/customers - List semua pelanggan (Tabel CRM)
				customers.GET("", cfg.CustomerHandler.List)
				// POST /api/v1/customers - Registrasi manual pelanggan
				customers.POST("", cfg.CustomerHandler.Create)
				// GET /api/v1/customers/:id - Detail profil & history (Modal Profil)
				customers.GET("/:id", cfg.CustomerHandler.GetByID)
				// GET /api/v1/customers/search - Cek member via phone (Guna di POS)
				customers.GET("/search", cfg.CustomerHandler.SearchByPhone)
			}

			protected.GET("/me", cfg.AuthHandler.CheckMe)
		}
	}

	return r
}