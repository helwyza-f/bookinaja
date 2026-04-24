package protected

import (
	"github.com/gin-gonic/gin"
	"github.com/helwiza/saas/internal/middleware"
	"github.com/helwiza/saas/internal/platform/http/routecfg"
	"github.com/helwiza/saas/internal/platform/http/upload"
)

func Register(r *gin.RouterGroup, cfg routecfg.Config) {
	protected := r.Group("/")
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
			customerArea.POST("/bookings/:id/activate", cfg.ReservationHandler.CustomerActivate)
			customerArea.POST("/bookings/:id/extend", cfg.ReservationHandler.CustomerExtendSession)
			customerArea.POST("/bookings/:id/orders", cfg.ReservationHandler.CustomerAddOrder)
			customerArea.POST("/bookings/:id/addons", cfg.ReservationHandler.CustomerAddAddonItem)
		}

		adminArea := protected.Group("/")
		adminArea.Use(middleware.AdminOnly())
		{
			adminArea.GET("/auth/me", cfg.AuthHandler.CheckMe)

			ownerArea := adminArea.Group("/")
			ownerArea.Use(middleware.OwnerOnly())
			{
				ownerAdmin := ownerArea.Group("/admin")
				{
					ownerAdmin.GET("/profile", cfg.TenantHandler.GetProfile)
					ownerAdmin.PUT("/profile", cfg.TenantHandler.UpdateProfile)
					ownerAdmin.POST("/upload", func(c *gin.Context) {
						upload.HandleSingleUpload(c, "tenants")
					})
				}

				billingGroup := ownerArea.Group("/billing")
				{
					billingGroup.GET("/subscription", cfg.BillingHandler.GetSubscription)
					billingGroup.GET("/orders", cfg.BillingHandler.ListOrders)
					billingGroup.POST("/checkout", cfg.BillingHandler.Checkout)
					billingGroup.POST("/bookings/checkout", cfg.BillingHandler.BookingCheckout)
				}

				settingsGroup := ownerArea.Group("/admin/settings")
				{
					settingsGroup.GET("/staff", cfg.TenantHandler.ListStaff)
					settingsGroup.POST("/staff", cfg.TenantHandler.CreateStaff)
					settingsGroup.DELETE("/staff/:id", cfg.TenantHandler.DeleteStaff)
					settingsGroup.GET("/activity", cfg.TenantHandler.ListActivity)
					settingsGroup.POST("/customers/blast", cfg.CustomerHandler.BlastAnnouncement)
				}
			}

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
					upload.HandleSingleUpload(c, "resources/covers")
				})
				resources.POST("/upload-gallery", func(c *gin.Context) {
					upload.HandleBulkUpload(c, "resources/gallery")
				})
			}

			bookings := adminArea.Group("/bookings")
			{
				bookings.GET("", cfg.ReservationHandler.ListAll)
				bookings.GET("/:id", cfg.ReservationHandler.GetDetail)
				bookings.PUT("/:id/status", cfg.ReservationHandler.UpdateStatus)
				bookings.POST("/:id/settle-cash", cfg.ReservationHandler.SettleCash)
				bookings.POST("/manual", cfg.ReservationHandler.Create)
				bookings.GET("/pos/active", cfg.ReservationHandler.GetActiveSessions)
				bookings.POST("/pos/order/:id", cfg.ReservationHandler.AddOrder)
				bookings.POST("/:id/extend", cfg.ReservationHandler.ExtendSession)
				bookings.POST("/:id/addons", cfg.ReservationHandler.AddAddonItem)
			}

			fnbGroup := adminArea.Group("/fnb")
			{
				fnbGroup.GET("", cfg.FnbHandler.GetMenu)
				fnbGroup.POST("", cfg.FnbHandler.CreateItem)
				fnbGroup.PUT("/:id", cfg.FnbHandler.UpdateItem)
				fnbGroup.DELETE("/:id", cfg.FnbHandler.DeleteItem)
				fnbGroup.POST("/upload", func(c *gin.Context) {
					upload.HandleSingleUpload(c, "fnb")
				})
			}

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
