package protected

import (
	"github.com/gin-gonic/gin"
	"github.com/helwiza/backend/internal/middleware"
	"github.com/helwiza/backend/internal/platform/http/routecfg"
	"github.com/helwiza/backend/internal/platform/http/upload"
	"github.com/helwiza/backend/internal/tenant"
)

func Register(r *gin.RouterGroup, cfg routecfg.Config) {
	protected := r.Group("/")
	protected.Use(middleware.AuthMiddleware(cfg.DB))
	{
		platformProtected := protected.Group("/platform")
		platformProtected.Use(middleware.PlatformOnly())
		{
			platformProtected.GET("/me", cfg.PlatformHandler.Me)
			platformProtected.GET("/summary", cfg.PlatformHandler.Summary)
			platformProtected.GET("/discovery/analytics", cfg.PlatformHandler.DiscoveryAnalytics)
			platformProtected.GET("/revenue", cfg.PlatformHandler.Revenue)
			platformProtected.GET("/revenue/breakdown", cfg.PlatformHandler.RevenueBreakdown)
			platformProtected.GET("/revenue/timeseries", cfg.PlatformHandler.RevenueTimeseries)
			platformProtected.GET("/revenue/export", cfg.PlatformHandler.RevenueCSV)
			platformProtected.GET("/tenants", cfg.PlatformHandler.Tenants)
			platformProtected.PATCH("/tenants/:tenant_id/discovery", cfg.PlatformHandler.UpdateTenantDiscoveryEditorial)
			platformProtected.GET("/tenants/:tenant_id", cfg.PlatformHandler.TenantDetail)
			platformProtected.GET("/tenants/:tenant_id/customers", cfg.PlatformHandler.TenantCustomers)
			platformProtected.GET("/tenants/:tenant_id/transactions", cfg.PlatformHandler.TenantTransactions)
			platformProtected.GET("/tenants/:tenant_id/balance", cfg.PlatformHandler.TenantBalanceDetail)
			platformProtected.GET("/tenants/:tenant_id/notif-history", cfg.PlatformHandler.TenantMidtransNotifications)
			platformProtected.GET("/customers", cfg.PlatformHandler.Customers)
			platformProtected.GET("/transactions", cfg.PlatformHandler.Transactions)
			platformProtected.GET("/midtrans-notifications", cfg.PlatformHandler.MidtransNotifications)
			platformProtected.GET("/referral-withdrawals", cfg.PlatformHandler.ReferralWithdrawals)
			platformProtected.PATCH("/referral-withdrawals/:id", cfg.PlatformHandler.UpdateReferralWithdrawalStatus)
		}

		me := protected.Group("/me")
		{
			me.GET("", cfg.CustomerHandler.GetMe)
			me.GET("/bookings/:id", cfg.ReservationHandler.GetMyDetail)
		}

		user := protected.Group("/user")
		{
			user.GET("/me", cfg.CustomerHandler.GetMe)
			user.GET("/me/discover/feed", cfg.TenantHandler.CustomerDiscoverFeed)
			user.PUT("/me", cfg.CustomerHandler.UpdateMe)
			user.GET("/me/bookings/:id", cfg.ReservationHandler.GetMyDetail)
			user.GET("/me/bookings/:id/context", cfg.ReservationHandler.GetCustomerLiveSnapshot)
			user.GET("/me/bookings/:id/availability", cfg.ReservationHandler.CustomerBookingAvailability)
			user.POST("/me/bookings/:id/activate", cfg.ReservationHandler.CustomerActivate)
			user.POST("/me/bookings/:id/complete", cfg.ReservationHandler.CustomerCompleteSession)
			user.POST("/me/bookings/:id/extend", cfg.ReservationHandler.CustomerExtendSession)
			user.POST("/me/bookings/:id/orders", cfg.ReservationHandler.CustomerAddOrder)
			user.POST("/me/bookings/:id/addons", cfg.ReservationHandler.CustomerAddAddonItem)
		}

		customerArea := protected.Group("/customer")
		{
			customerArea.GET("/resources", cfg.ReservationHandler.GetCustomerResources)
			customerArea.GET("/fnb", cfg.ReservationHandler.GetCustomerFnb)
			customerArea.GET("/bookings/:id", cfg.ReservationHandler.GetMyDetail)
			customerArea.GET("/bookings/:id/context", cfg.ReservationHandler.GetCustomerLiveSnapshot)
			customerArea.GET("/bookings/:id/availability", cfg.ReservationHandler.CustomerBookingAvailability)
			customerArea.POST("/bookings/:id/activate", cfg.ReservationHandler.CustomerActivate)
			customerArea.POST("/bookings/:id/complete", cfg.ReservationHandler.CustomerCompleteSession)
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
					ownerAdmin.GET("/growth/feed", cfg.TenantHandler.OwnerDiscoverFeed)
					ownerAdmin.GET("/growth/posts", cfg.TenantHandler.ListTenantPosts)
					ownerAdmin.POST("/growth/posts", cfg.TenantHandler.CreateTenantPost)
					ownerAdmin.PUT("/growth/posts/:id", cfg.TenantHandler.UpdateTenantPost)
					ownerAdmin.DELETE("/growth/posts/:id", cfg.TenantHandler.DeleteTenantPost)
					ownerAdmin.GET("/receipt-settings", cfg.TenantHandler.GetReceiptSettings)
					ownerAdmin.PUT("/receipt-settings", cfg.TenantHandler.UpdateReceiptSettings)
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
					settingsGroup.GET("/referrals/summary", cfg.TenantHandler.GetReferralSummary)
					settingsGroup.GET("/referrals", cfg.TenantHandler.ListReferrals)
					settingsGroup.GET("/referrals/withdrawals", cfg.TenantHandler.ListReferralWithdrawals)
					settingsGroup.POST("/referrals/withdrawals", cfg.TenantHandler.RequestReferralWithdrawal)
					settingsGroup.PUT("/referrals/payout", cfg.TenantHandler.UpdateReferralPayout)
					settingsGroup.GET("/roles", cfg.TenantHandler.ListStaffRoles)
					settingsGroup.POST("/roles", cfg.TenantHandler.CreateStaffRole)
					settingsGroup.PUT("/roles/:id", cfg.TenantHandler.UpdateStaffRole)
					settingsGroup.DELETE("/roles/:id", cfg.TenantHandler.DeleteStaffRole)
					settingsGroup.GET("/staff", cfg.TenantHandler.ListStaff)
					settingsGroup.POST("/staff", cfg.TenantHandler.CreateStaff)
					settingsGroup.PUT("/staff/:id", cfg.TenantHandler.UpdateStaff)
					settingsGroup.DELETE("/staff/:id", cfg.TenantHandler.DeleteStaff)
					settingsGroup.GET("/activity", cfg.TenantHandler.ListActivity)
					settingsGroup.GET("/customers/legacy", cfg.CustomerHandler.ListLegacyContacts)
					settingsGroup.POST("/customers/import", cfg.CustomerHandler.ImportCustomers)
					settingsGroup.POST("/customers/blast", cfg.CustomerHandler.BlastAnnouncement)
				}
			}

			resources := adminArea.Group("/resources-all")
			{
				resources.GET("", middleware.RequirePermission(tenant.PermissionResourcesRead), cfg.ResourceHandler.List)
				resources.GET("/:id", middleware.RequirePermission(tenant.PermissionResourcesRead), cfg.ResourceHandler.GetByID)
				resources.POST("", middleware.RequirePermission(tenant.PermissionResourcesCreate), cfg.ResourceHandler.Create)
				resources.PUT("/:id", middleware.RequirePermission(tenant.PermissionResourcesUpdate), cfg.ResourceHandler.Update)
				resources.DELETE("/:id", middleware.RequirePermission(tenant.PermissionResourcesDelete), cfg.ResourceHandler.Delete)
				resources.GET("/:id/items", middleware.RequirePermission(tenant.PermissionResourcesRead), cfg.ResourceHandler.ListItems)
				resources.POST("/:id/items", middleware.RequirePermission(tenant.PermissionResourcesUpdate), cfg.ResourceHandler.AddItem)
				resources.PUT("/items/:id", middleware.RequirePermission(tenant.PermissionResourcesUpdate), cfg.ResourceHandler.UpdateItem)
				resources.DELETE("/items/:id", middleware.RequirePermission(tenant.PermissionResourcesDelete), cfg.ResourceHandler.DeleteItem)
				resources.POST("/upload-cover", middleware.RequirePermission(tenant.PermissionResourcesUpdate), func(c *gin.Context) {
					upload.HandleSingleUpload(c, "resources/covers")
				})
				resources.POST("/upload-gallery", middleware.RequirePermission(tenant.PermissionResourcesUpdate), func(c *gin.Context) {
					upload.HandleBulkUpload(c, "resources/gallery")
				})
			}

			expenses := adminArea.Group("/expenses")
			{
				expenses.GET("", middleware.RequirePermission(tenant.PermissionExpensesRead), cfg.ExpenseHandler.List)
				expenses.GET("/summary", middleware.RequirePermission(tenant.PermissionExpensesRead), cfg.ExpenseHandler.Summary)
				expenses.GET("/:id", middleware.RequirePermission(tenant.PermissionExpensesRead), cfg.ExpenseHandler.GetByID)
				expenses.POST("", middleware.RequirePermission(tenant.PermissionExpensesCreate), cfg.ExpenseHandler.Create)
				expenses.PUT("/:id", middleware.RequirePermission(tenant.PermissionExpensesUpdate), cfg.ExpenseHandler.Update)
				expenses.DELETE("/:id", middleware.RequirePermission(tenant.PermissionExpensesDelete), cfg.ExpenseHandler.Delete)
				expenses.POST("/upload-receipt", middleware.RequirePermission(tenant.PermissionExpensesUpdate), func(c *gin.Context) {
					upload.HandleSingleUpload(c, "expenses/receipts")
				})
			}

			bookings := adminArea.Group("/bookings")
			{
				bookings.GET("", middleware.RequirePermission(tenant.PermissionBookingsRead), cfg.ReservationHandler.ListAll)
				bookings.GET("/:id", middleware.RequirePermission(tenant.PermissionBookingsRead), cfg.ReservationHandler.GetDetail)
				bookings.PUT("/:id/status", middleware.RequireBookingStatusPermission(), cfg.ReservationHandler.UpdateStatus)
				bookings.POST("/:id/settle-cash", middleware.RequirePermission(tenant.PermissionPosCashSettle), cfg.ReservationHandler.SettleCash)
				bookings.POST("/:id/receipt/send", middleware.RequirePermission(tenant.PermissionReceiptsSend), cfg.ReservationHandler.SendReceiptWhatsApp)
				bookings.POST("/manual", middleware.RequirePermission(tenant.PermissionBookingsCreate), cfg.ReservationHandler.Create)
				bookings.GET("/pos/active", middleware.RequirePermission(tenant.PermissionPosRead), cfg.ReservationHandler.GetActiveSessions)
				bookings.POST("/pos/order/:id", middleware.RequirePermission(tenant.PermissionPosOrderAdd), cfg.ReservationHandler.AddOrder)
				bookings.POST("/:id/extend", middleware.RequirePermission(tenant.PermissionSessionsExtend), cfg.ReservationHandler.ExtendSession)
				bookings.POST("/:id/addons", middleware.RequirePermission(tenant.PermissionPosOrderAdd), cfg.ReservationHandler.AddAddonItem)
			}

			fnbGroup := adminArea.Group("/fnb")
			{
				fnbGroup.GET("", middleware.RequirePermission(tenant.PermissionFnbRead), cfg.FnbHandler.GetMenu)
				fnbGroup.POST("", middleware.RequirePermission(tenant.PermissionFnbCreate), cfg.FnbHandler.CreateItem)
				fnbGroup.PUT("/:id", middleware.RequirePermission(tenant.PermissionFnbUpdate), cfg.FnbHandler.UpdateItem)
				fnbGroup.DELETE("/:id", middleware.RequirePermission(tenant.PermissionFnbDelete), cfg.FnbHandler.DeleteItem)
				fnbGroup.POST("/upload", middleware.RequirePermission(tenant.PermissionFnbUpdate), func(c *gin.Context) {
					upload.HandleSingleUpload(c, "fnb")
				})
			}

			customers := adminArea.Group("/customers")
			customers.Use(middleware.RequirePermission(tenant.PermissionCustomersRead))
			{
				customers.GET("", cfg.CustomerHandler.List)
				customers.GET("/search", cfg.CustomerHandler.SearchByPhone)
				customers.GET("/:id/history", cfg.CustomerHandler.GetHistory)
				customers.GET("/:id/points", cfg.CustomerHandler.GetPoints)
				customers.GET("/:id", cfg.CustomerHandler.GetByID)
			}
		}
	}
}
