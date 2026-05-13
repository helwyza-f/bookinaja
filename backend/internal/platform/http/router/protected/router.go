package protected

import (
	"github.com/gin-gonic/gin"
	"github.com/helwiza/backend/internal/middleware"
	"github.com/helwiza/backend/internal/platform/access"
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
			platformProtected.POST("/emails/send", cfg.PlatformHandler.SendEmail)
			platformProtected.GET("/emails/logs", cfg.PlatformHandler.ListEmailLogs)
			platformProtected.GET("/emails/logs/:id", cfg.PlatformHandler.GetEmailLog)
			platformProtected.GET("/emails/sent", cfg.PlatformHandler.ListSentEmails)
			platformProtected.GET("/emails/sent/:id", cfg.PlatformHandler.GetSentEmail)
			platformProtected.GET("/emails/received", cfg.PlatformHandler.ListReceivedEmails)
			platformProtected.GET("/emails/received/:id", cfg.PlatformHandler.GetReceivedEmail)
			platformProtected.GET("/discovery/analytics", cfg.PlatformHandler.DiscoveryAnalytics)
			platformProtected.GET("/discovery-feed/settings", cfg.PlatformHandler.GetDiscoveryFeedSetting)
			platformProtected.PATCH("/discovery-feed/settings", cfg.PlatformHandler.UpdateDiscoveryFeedSetting)
			platformProtected.GET("/plan-features", cfg.PlatformHandler.GetPlanFeatureSettings)
			platformProtected.PATCH("/plan-features", cfg.PlatformHandler.UpdatePlanFeatureSettings)
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
			user.GET("/me/summary", cfg.CustomerHandler.GetSummary)
			user.GET("/me/active", cfg.CustomerHandler.GetActive)
			user.GET("/me/history", cfg.CustomerHandler.GetPortalHistory)
			user.GET("/me/settings", cfg.CustomerHandler.GetSettings)
			user.GET("/me/discover/feed", cfg.TenantHandler.CustomerDiscoverFeed)
			user.PUT("/me", cfg.CustomerHandler.UpdateMe)
			user.POST("/me/google/link", cfg.CustomerHandler.LinkMyGoogle)
			user.POST("/me/email/verify/request", cfg.CustomerHandler.RequestMyEmailVerification)
			user.POST("/me/avatar", cfg.CustomerHandler.UploadMyAvatar)
			user.POST("/me/password", cfg.CustomerHandler.UpdateMyPassword)
			user.POST("/me/phone/request-change", cfg.CustomerHandler.RequestMyPhoneChange)
			user.POST("/me/phone/verify-change", cfg.CustomerHandler.VerifyMyPhoneChange)
			user.GET("/me/bookings/:id", cfg.ReservationHandler.GetMyDetail)
			user.GET("/me/orders/:id", cfg.SalesHandler.GetMyDetail)
			user.GET("/me/bookings/:id/context", cfg.ReservationHandler.GetCustomerLiveSnapshot)
			user.GET("/me/bookings/:id/availability", cfg.ReservationHandler.CustomerBookingAvailability)
			user.POST("/me/bookings/:id/activate", cfg.ReservationHandler.CustomerActivate)
			user.POST("/me/bookings/:id/complete", cfg.ReservationHandler.CustomerCompleteSession)
			user.POST("/me/bookings/:id/upload-proof", func(c *gin.Context) {
				upload.HandleSingleUpload(c, "payments/proofs")
			})
			user.POST("/me/bookings/:id/manual-payment", cfg.BillingHandler.SubmitManualBookingPayment)
			user.POST("/me/orders/:id/upload-proof", func(c *gin.Context) {
				upload.HandleSingleUpload(c, "payments/proofs")
			})
			user.POST("/me/orders/:id/payment-checkout", cfg.SalesHandler.CustomerCheckoutPayment)
			user.POST("/me/orders/:id/manual-payment", cfg.SalesHandler.CustomerSubmitManualPayment)
			user.POST("/me/bookings/:id/extend", cfg.ReservationHandler.CustomerExtendSession)
			user.POST("/me/bookings/:id/orders", cfg.ReservationHandler.CustomerAddOrder)
			user.POST("/me/bookings/:id/addons", cfg.ReservationHandler.CustomerAddAddonItem)
		}

		customerArea := protected.Group("/customer")
		{
			customerArea.GET("/resources", cfg.ReservationHandler.GetCustomerResources)
			customerArea.GET("/fnb", cfg.ReservationHandler.GetCustomerFnb)
			customerArea.GET("/bookings/:id", cfg.ReservationHandler.GetMyDetail)
			customerArea.GET("/orders/:id", cfg.SalesHandler.GetMyDetail)
			customerArea.GET("/bookings/:id/context", cfg.ReservationHandler.GetCustomerLiveSnapshot)
			customerArea.GET("/bookings/:id/availability", cfg.ReservationHandler.CustomerBookingAvailability)
			customerArea.POST("/bookings/:id/activate", cfg.ReservationHandler.CustomerActivate)
			customerArea.POST("/bookings/:id/complete", cfg.ReservationHandler.CustomerCompleteSession)
			customerArea.POST("/bookings/:id/upload-proof", func(c *gin.Context) {
				upload.HandleSingleUpload(c, "payments/proofs")
			})
			customerArea.POST("/bookings/:id/manual-payment", cfg.BillingHandler.SubmitManualBookingPayment)
			customerArea.POST("/orders/:id/upload-proof", func(c *gin.Context) {
				upload.HandleSingleUpload(c, "payments/proofs")
			})
			customerArea.POST("/orders/:id/payment-checkout", cfg.SalesHandler.CustomerCheckoutPayment)
			customerArea.POST("/orders/:id/manual-payment", cfg.SalesHandler.CustomerSubmitManualPayment)
			customerArea.POST("/bookings/:id/extend", cfg.ReservationHandler.CustomerExtendSession)
			customerArea.POST("/bookings/:id/orders", cfg.ReservationHandler.CustomerAddOrder)
			customerArea.POST("/bookings/:id/addons", cfg.ReservationHandler.CustomerAddAddonItem)
		}

		adminArea := protected.Group("/")
		adminArea.Use(middleware.AdminOnly())
		{
			adminArea.GET("/auth/me", cfg.AuthHandler.CheckMe)
			adminArea.GET("/admin/me/bootstrap", cfg.TenantHandler.GetAdminBootstrap)

			ownerArea := adminArea.Group("/")
			ownerArea.Use(middleware.OwnerOnly())
			{
				ownerAdmin := ownerArea.Group("/admin")
				{
					ownerAdmin.GET("/profile", cfg.TenantHandler.GetProfile)
					ownerAdmin.GET("/account", cfg.TenantHandler.GetOwnerAccount)
					ownerAdmin.PUT("/account/identity", cfg.TenantHandler.UpdateOwnerAccountIdentity)
					ownerAdmin.POST("/account/password/setup", cfg.TenantHandler.SetupOwnerPassword)
					ownerAdmin.POST("/account/password/change", cfg.TenantHandler.ChangeOwnerPassword)
					ownerAdmin.POST("/account/google/link", cfg.TenantHandler.LinkOwnerGoogle)
					ownerAdmin.POST("/account/email/verify/request", cfg.TenantHandler.RequestOwnerEmailVerification)
					ownerAdmin.DELETE("/account", cfg.TenantHandler.DeleteOwnerAccount)
					ownerAdmin.GET("/tenant/identity", cfg.TenantHandler.GetTenantIdentity)
					ownerAdmin.GET("/tenant/discovery-profile", cfg.TenantHandler.GetTenantDiscoveryProfile)
					ownerAdmin.GET("/tenant/onboarding-summary", cfg.TenantHandler.GetTenantOnboardingSummary)
					ownerAdmin.PUT("/profile", cfg.TenantHandler.UpdateProfile)
					ownerAdmin.GET("/page-builder", cfg.TenantHandler.GetPageBuilder)
					ownerAdmin.PUT("/page-builder", cfg.TenantHandler.UpdatePageBuilder)
					ownerAdmin.GET("/growth/settings", cfg.TenantHandler.GetGrowthSettings)
					ownerAdmin.GET("/growth/feed", cfg.TenantHandler.OwnerDiscoverFeed)
					ownerAdmin.GET("/growth/posts", cfg.TenantHandler.ListTenantPosts)
					ownerAdmin.POST("/growth/posts", cfg.TenantHandler.CreateTenantPost)
					ownerAdmin.PUT("/growth/posts/:id", cfg.TenantHandler.UpdateTenantPost)
					ownerAdmin.DELETE("/growth/posts/:id", cfg.TenantHandler.DeleteTenantPost)
					ownerAdmin.GET("/receipt-settings", middleware.RequireAnyTenantFeature(cfg.DB, access.FeatureAdvancedReceiptBranding), cfg.TenantHandler.GetReceiptSettings)
					ownerAdmin.PUT("/receipt-settings", middleware.RequireAnyTenantFeature(cfg.DB, access.FeatureAdvancedReceiptBranding), cfg.TenantHandler.UpdateReceiptSettings)
					ownerAdmin.GET("/referral-payout-settings", cfg.TenantHandler.GetReferralPayoutSettings)
					ownerAdmin.GET("/payment-methods", middleware.RequireAnyTenantFeature(cfg.DB, access.FeaturePaymentMethodManagement, access.FeatureManualPaymentVerification), cfg.TenantHandler.GetPaymentMethods)
					ownerAdmin.PUT("/payment-methods", middleware.RequireAnyTenantFeature(cfg.DB, access.FeaturePaymentMethodManagement, access.FeatureManualPaymentVerification), cfg.TenantHandler.UpdatePaymentMethods)
					ownerAdmin.GET("/deposit-settings", middleware.RequireAnyTenantFeature(cfg.DB, access.FeaturePaymentMethodManagement, access.FeatureManualPaymentVerification), cfg.TenantHandler.GetDepositSettings)
					ownerAdmin.PUT("/deposit-settings", middleware.RequireAnyTenantFeature(cfg.DB, access.FeaturePaymentMethodManagement, access.FeatureManualPaymentVerification), cfg.TenantHandler.UpdateDepositSettings)
					ownerAdmin.POST("/upload", func(c *gin.Context) {
						upload.HandleSingleUpload(c, "tenants")
					})
					ownerAdmin.POST("/upload/direct/initiate", func(c *gin.Context) {
						upload.HandleDirectInitiate(c, "tenants")
					})
					ownerAdmin.GET("/upload/direct/:uploadID/part-url", upload.HandleDirectPartURL)
					ownerAdmin.POST("/upload/direct/:uploadID/complete", upload.HandleDirectComplete)
					ownerAdmin.POST("/upload/chunk/initiate", func(c *gin.Context) {
						upload.HandleChunkInitiate(c, "tenants")
					})
					ownerAdmin.POST("/upload/chunk/:uploadID/part", upload.HandleChunkPart)
					ownerAdmin.POST("/upload/chunk/:uploadID/complete", upload.HandleChunkComplete)
					ownerAdmin.POST("/upload-media", func(c *gin.Context) {
						upload.HandleSingleUpload(c, "tenants/media")
					})
					ownerAdmin.POST("/upload-media/direct/initiate", func(c *gin.Context) {
						upload.HandleDirectInitiate(c, "tenants/media")
					})
					ownerAdmin.GET("/upload-media/direct/:uploadID/part-url", upload.HandleDirectPartURL)
					ownerAdmin.POST("/upload-media/direct/:uploadID/complete", upload.HandleDirectComplete)
					ownerAdmin.POST("/upload-media/chunk/initiate", func(c *gin.Context) {
						upload.HandleChunkInitiate(c, "tenants/media")
					})
					ownerAdmin.POST("/upload-media/chunk/:uploadID/part", upload.HandleChunkPart)
					ownerAdmin.POST("/upload-media/chunk/:uploadID/complete", upload.HandleChunkComplete)
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
					settingsGroup.GET("/promos", cfg.PromoHandler.List)
					settingsGroup.POST("/promos", cfg.PromoHandler.Create)
					settingsGroup.GET("/promos/:id", cfg.PromoHandler.GetByID)
					settingsGroup.GET("/promos/:id/redemptions", cfg.PromoHandler.ListRedemptions)
					settingsGroup.PUT("/promos/:id", cfg.PromoHandler.Update)
					settingsGroup.PATCH("/promos/:id/status", cfg.PromoHandler.UpdateStatus)
					settingsGroup.GET("/roles", middleware.RequireAnyTenantFeature(cfg.DB, access.FeatureRolePermissions, access.FeatureStaffAccounts), cfg.TenantHandler.ListStaffRoles)
					settingsGroup.POST("/roles", middleware.RequireAnyTenantFeature(cfg.DB, access.FeatureRolePermissions, access.FeatureStaffAccounts), cfg.TenantHandler.CreateStaffRole)
					settingsGroup.PUT("/roles/:id", middleware.RequireAnyTenantFeature(cfg.DB, access.FeatureRolePermissions, access.FeatureStaffAccounts), cfg.TenantHandler.UpdateStaffRole)
					settingsGroup.DELETE("/roles/:id", middleware.RequireAnyTenantFeature(cfg.DB, access.FeatureRolePermissions, access.FeatureStaffAccounts), cfg.TenantHandler.DeleteStaffRole)
					settingsGroup.GET("/staff", middleware.RequireAnyTenantFeature(cfg.DB, access.FeatureStaffAccounts, access.FeatureRolePermissions), cfg.TenantHandler.ListStaff)
					settingsGroup.POST("/staff", middleware.RequireAnyTenantFeature(cfg.DB, access.FeatureStaffAccounts, access.FeatureRolePermissions), cfg.TenantHandler.CreateStaff)
					settingsGroup.PUT("/staff/:id", middleware.RequireAnyTenantFeature(cfg.DB, access.FeatureStaffAccounts, access.FeatureRolePermissions), cfg.TenantHandler.UpdateStaff)
					settingsGroup.DELETE("/staff/:id", middleware.RequireAnyTenantFeature(cfg.DB, access.FeatureStaffAccounts, access.FeatureRolePermissions), cfg.TenantHandler.DeleteStaff)
					settingsGroup.GET("/activity", cfg.TenantHandler.ListActivity)
					settingsGroup.GET("/customers/legacy", middleware.RequireAnyTenantFeature(cfg.DB, access.FeatureCrmBasic, access.FeatureCustomerImport), cfg.CustomerHandler.ListLegacyContacts)
					settingsGroup.POST("/customers/import", middleware.RequireAnyTenantFeature(cfg.DB, access.FeatureCustomerImport), cfg.CustomerHandler.ImportCustomers)
					settingsGroup.POST("/customers/blast", middleware.RequireAnyTenantFeature(cfg.DB, access.FeatureWhatsAppBroadcast), cfg.CustomerHandler.BlastAnnouncement)
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
				resources.POST("/upload-cover/direct/initiate", middleware.RequirePermission(tenant.PermissionResourcesUpdate), func(c *gin.Context) {
					upload.HandleDirectInitiate(c, "resources/covers")
				})
				resources.GET("/upload-cover/direct/:uploadID/part-url", middleware.RequirePermission(tenant.PermissionResourcesUpdate), upload.HandleDirectPartURL)
				resources.POST("/upload-cover/direct/:uploadID/complete", middleware.RequirePermission(tenant.PermissionResourcesUpdate), upload.HandleDirectComplete)
				resources.POST("/upload-cover/chunk/initiate", middleware.RequirePermission(tenant.PermissionResourcesUpdate), func(c *gin.Context) {
					upload.HandleChunkInitiate(c, "resources/covers")
				})
				resources.POST("/upload-cover/chunk/:uploadID/part", middleware.RequirePermission(tenant.PermissionResourcesUpdate), upload.HandleChunkPart)
				resources.POST("/upload-cover/chunk/:uploadID/complete", middleware.RequirePermission(tenant.PermissionResourcesUpdate), upload.HandleChunkComplete)
				resources.POST("/upload-gallery", middleware.RequirePermission(tenant.PermissionResourcesUpdate), func(c *gin.Context) {
					upload.HandleBulkUpload(c, "resources/gallery")
				})
			}

			adminResources := adminArea.Group("/admin/resources")
			{
				adminResources.GET("/summary", middleware.RequirePermission(tenant.PermissionResourcesRead), cfg.ResourceHandler.ListSummary)
				adminResources.GET("/list", middleware.RequirePermission(tenant.PermissionResourcesRead), cfg.ResourceHandler.ListAdminCatalog)
				adminResources.GET("/pricing-catalog", middleware.RequirePermission(tenant.PermissionResourcesRead), cfg.ResourceHandler.ListPricingCatalog)
				adminResources.GET("/addons-catalog", middleware.RequirePermission(tenant.PermissionResourcesRead), cfg.ResourceHandler.ListAddonCatalog)
				adminResources.GET("/pos-catalog", middleware.RequirePermission(tenant.PermissionResourcesRead), cfg.ResourceHandler.ListPOSCatalog)
				adminResources.GET("/device-map", middleware.RequirePermission(tenant.PermissionDevicesRead), cfg.ResourceHandler.ListDeviceMap)
				adminResources.GET("/:id", middleware.RequirePermission(tenant.PermissionResourcesRead), cfg.ResourceHandler.GetByID)
			}

			devices := adminArea.Group("/devices")
			{
				devices.GET("/overview", middleware.RequirePermission(tenant.PermissionDevicesRead), cfg.SmartDeviceHandler.Overview)
				devices.GET("", middleware.RequirePermission(tenant.PermissionDevicesRead), cfg.SmartDeviceHandler.List)
				devices.POST("/claim", middleware.RequirePermission(tenant.PermissionDevicesClaim), cfg.SmartDeviceHandler.Claim)
				devices.GET("/:id", middleware.RequirePermission(tenant.PermissionDevicesRead), cfg.SmartDeviceHandler.GetDetail)
				devices.POST("/:id/assign", middleware.RequirePermission(tenant.PermissionDevicesAssign), cfg.SmartDeviceHandler.Assign)
				devices.POST("/:id/unassign", middleware.RequirePermission(tenant.PermissionDevicesAssign), cfg.SmartDeviceHandler.Unassign)
				devices.POST("/:id/enable", middleware.RequirePermission(tenant.PermissionDevicesControl), cfg.SmartDeviceHandler.Enable)
				devices.POST("/:id/disable", middleware.RequirePermission(tenant.PermissionDevicesControl), cfg.SmartDeviceHandler.Disable)
				devices.POST("/:id/test", middleware.RequirePermission(tenant.PermissionDevicesControl), cfg.SmartDeviceHandler.Test)
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

			salesOrders := adminArea.Group("/sales-orders")
			{
				salesOrders.GET("", middleware.RequirePermission(tenant.PermissionPosRead), cfg.SalesHandler.List)
				salesOrders.GET("/open", middleware.RequirePermission(tenant.PermissionPosRead), cfg.SalesHandler.ListOpen)
				salesOrders.GET("/:id", middleware.RequirePermission(tenant.PermissionPosRead), cfg.SalesHandler.GetByID)
				salesOrders.POST("", middleware.RequirePermission(tenant.PermissionPosOrderAdd), cfg.SalesHandler.Create)
				salesOrders.POST("/:id/items", middleware.RequirePermission(tenant.PermissionPosOrderAdd), cfg.SalesHandler.AddItem)
				salesOrders.PUT("/:id/items/:item_id", middleware.RequirePermission(tenant.PermissionPosOrderAdd), cfg.SalesHandler.UpdateItem)
				salesOrders.DELETE("/:id/items/:item_id", middleware.RequirePermission(tenant.PermissionPosOrderAdd), cfg.SalesHandler.DeleteItem)
				salesOrders.POST("/:id/checkout", middleware.RequirePermission(tenant.PermissionPosCheckout), cfg.SalesHandler.Checkout)
				salesOrders.POST("/:id/payment-checkout", middleware.RequirePermission(tenant.PermissionPosCheckout), cfg.SalesHandler.CheckoutPayment)
				salesOrders.POST("/:id/manual-payment", middleware.RequirePermission(tenant.PermissionPosCashSettle), cfg.SalesHandler.SubmitManualPayment)
				salesOrders.POST("/payment-attempts/:attempt_id/verify", middleware.RequirePermission(tenant.PermissionPosCashSettle), cfg.SalesHandler.VerifyManualPayment)
				salesOrders.POST("/payment-attempts/:attempt_id/reject", middleware.RequirePermission(tenant.PermissionPosCashSettle), cfg.SalesHandler.RejectManualPayment)
				salesOrders.POST("/:id/settle-cash", middleware.RequirePermission(tenant.PermissionPosCashSettle), cfg.SalesHandler.SettleCash)
				salesOrders.POST("/:id/close", middleware.RequirePermission(tenant.PermissionPosCheckout), cfg.SalesHandler.Close)
			}

			pos := adminArea.Group("/pos")
			{
				pos.GET("/action-feed", middleware.RequirePermission(tenant.PermissionPosRead), cfg.SalesHandler.ActionFeed)
			}

			bookings := adminArea.Group("/bookings")
			{
				bookings.GET("", middleware.RequirePermission(tenant.PermissionBookingsRead), cfg.ReservationHandler.ListAll)
				bookings.GET("/analytics-summary", middleware.RequirePermission(tenant.PermissionAnalyticsRead), middleware.RequireAnyTenantFeature(cfg.DB, access.FeatureAdvancedAnalytics), cfg.ReservationHandler.GetAnalyticsSummary)
				bookings.GET("/:id", middleware.RequirePermission(tenant.PermissionBookingsRead), cfg.ReservationHandler.GetDetail)
				bookings.GET("/:id/payment-attempts", middleware.RequirePermission(tenant.PermissionBookingsRead), cfg.BillingHandler.ListBookingPaymentAttempts)
				bookings.PUT("/:id/status", middleware.RequireBookingStatusPermission(), cfg.ReservationHandler.UpdateStatus)
				bookings.POST("/:id/record-deposit", middleware.RequirePermission(tenant.PermissionPosCashSettle), cfg.ReservationHandler.RecordDeposit)
				bookings.POST("/:id/override-deposit", middleware.RequirePermission(tenant.PermissionSessionsStart), cfg.ReservationHandler.OverrideDeposit)
				bookings.POST("/:id/settle-cash", middleware.RequirePermission(tenant.PermissionPosCashSettle), cfg.ReservationHandler.SettleCash)
				bookings.POST("/:id/manual-payment", middleware.RequirePermission(tenant.PermissionPosCashSettle), cfg.BillingHandler.SubmitManualBookingPayment)
				bookings.POST("/payment-attempts/:attempt_id/verify", middleware.RequirePermission(tenant.PermissionPosCashSettle), cfg.BillingHandler.VerifyManualBookingPayment)
				bookings.POST("/payment-attempts/:attempt_id/reject", middleware.RequirePermission(tenant.PermissionPosCashSettle), cfg.BillingHandler.RejectManualBookingPayment)
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
				customers.GET("/count", cfg.CustomerHandler.Count)
				customers.GET("", cfg.CustomerHandler.List)
				customers.GET("/search", cfg.CustomerHandler.SearchByPhone)
				customers.GET("/:id/history", cfg.CustomerHandler.GetHistory)
				customers.GET("/:id/points", cfg.CustomerHandler.GetPoints)
				customers.GET("/:id", cfg.CustomerHandler.GetByID)
			}
		}
	}
}
