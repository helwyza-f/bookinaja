package reservation

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Handler struct {
	service *Service
}

func NewHandler(s *Service) *Handler {
	return &Handler{service: s}
}

// --- PUBLIC ENDPOINTS (Tanpa Auth / Customer Facing) ---

// Create menangani pembuatan booking baru sekaligus Silent Login untuk Portal Customer
func (h *Handler) Create(c *gin.Context) {
	var req CreateBookingReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "LENGKAPI DATA BOOKING DENGAN BENAR"})
		return
	}

	isManualWalkIn := c.FullPath() == "/api/v1/bookings/manual"

	// Memanggil service. Hasil kembalian menyertakan data Customer untuk generate JWT
	b, cust, err := h.service.Create(c.Request.Context(), req, isManualWalkIn)
	if err != nil {
		// Jika terjadi bentrok jadwal, return 409 Conflict
		if err.Error() == "MAAF, SLOT WAKTU TERSEBUT SUDAH TERISI" {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	tenantSlugVal, _ := c.Get("tenantSlug")
	tenantSlug, _ := tenantSlugVal.(string)
	redirectURL := bookingVerifyURL(tenantSlug, b.AccessToken.String())

	c.JSON(http.StatusCreated, gin.H{
		"message":      "BOOKING BERHASIL",
		"booking_id":   b.ID,
		"booking":      b,
		"customer":     cust,
		"redirect_url": redirectURL,
	})

	_ = h.service.SendBookingConfirmation(c.Request.Context(), b, cust, tenantSlug)
}

func (h *Handler) ExchangeAccessToken(c *gin.Context) {
	var req struct {
		Code string `json:"code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "KODE AKSES TIDAK VALID"})
		return
	}

	booking, cust, sessionToken, err := h.service.ExchangeAccessToken(c.Request.Context(), req.Code)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":        "AKSES BERHASIL DITUKAR",
		"booking_id":     booking.ID,
		"tenant_slug":    booking.TenantSlug,
		"redirect_url":   fmt.Sprintf("/user/me/bookings/%s/live", booking.ID.String()),
		"customer_token": sessionToken,
		"customer":       cust,
	})
}

// Availability mengecek slot waktu yang sudah terisi (Busy Slots)
func (h *Handler) Availability(c *gin.Context) {
	resourceID := c.Param("resource_id")
	dateStr := c.Query("date")

	targetDate, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		targetDate = time.Now()
	}

	busy, err := h.service.GetAvailability(c.Request.Context(), resourceID, targetDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "GAGAL MENGAMBIL DATA JADWAL"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"busy_slots": busy})
}

// Status mengambil detail booking berdasarkan Access Token (Tiket Guest)
func (h *Handler) Status(c *gin.Context) {
	token := c.Param("token")
	b, err := h.service.GetStatusByToken(c.Request.Context(), token)
	if err != nil || b == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "RESERVASI TIDAK DITEMUKAN"})
		return
	}
	c.JSON(http.StatusOK, b)
}

// --- ADMIN & POS CONTROL HUB ENDPOINTS (Protected by Middleware) ---

// ListAll mengambil histori booking untuk tabel dashboard
func (h *Handler) ListAll(c *gin.Context) {
	tenantID := c.MustGet("tenantID").(string)
	status := c.Query("status")

	bookings, err := h.service.ListByTenant(c.Request.Context(), tenantID, status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, bookings)
}

// GetActiveSessions menarik grid sesi Ongoing untuk POS
func (h *Handler) GetActiveSessions(c *gin.Context) {
	tenantID := c.MustGet("tenantID").(string)

	sessions, err := h.service.GetActiveSessions(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "GAGAL MENGAMBIL SESI AKTIF"})
		return
	}
	c.JSON(http.StatusOK, sessions)
}

// AddOrder menambah item FnB ke bill bokingan dari POS
func (h *Handler) AddOrder(c *gin.Context) {
	bookingID := c.Param("id")
	tenantID := c.MustGet("tenantID").(string)

	var req AddOrderReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "DATA PESANAN TIDAK VALID"})
		return
	}

	err := h.service.AddFnbOrder(c.Request.Context(), bookingID, tenantID, req, "admin")
	if err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "PESANAN BERHASIL DITAMBAHKAN"})
}

// ExtendSession menambah durasi unit dari Dashboard POS
func (h *Handler) ExtendSession(c *gin.Context) {
	bookingID := c.Param("id")
	tenantID := c.MustGet("tenantID").(string)

	var req struct {
		AdditionalDuration int `json:"additional_duration" binding:"required,min=1"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "DURASI MINIMAL 1 SESI"})
		return
	}

	err := h.service.ExtendSession(c.Request.Context(), bookingID, tenantID, req.AdditionalDuration, "admin")
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "DURASI BERHASIL DIPERPANJANG"})
}

// AddAddonItem menambah layanan resource tambahan ke billing
func (h *Handler) AddAddonItem(c *gin.Context) {
	bookingID := c.Param("id")
	tenantID := c.MustGet("tenantID").(string)

	var req struct {
		ItemID string `json:"item_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ITEM ID WAJIB DIISI"})
		return
	}

	err := h.service.AddAddonOrder(c.Request.Context(), bookingID, tenantID, req.ItemID, "admin")
	if err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "LAYANAN TAMBAHAN DITAMBAHKAN"})
}

// GetDetail detail lengkap untuk sidebar POS
func (h *Handler) GetDetail(c *gin.Context) {
	id := c.Param("id")
	tenantID := c.MustGet("tenantID").(string)

	booking, err := h.service.GetDetailForAdmin(c.Request.Context(), id, tenantID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "BOOKING TIDAK DITEMUKAN"})
		return
	}
	c.JSON(http.StatusOK, booking)
}

func (h *Handler) GetMyDetail(c *gin.Context) {
	id := c.Param("id")
	tenantID := optionalTenantID(c)
	customerIDValue, exists := c.Get("customerID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}

	customerID, ok := customerIDValue.(string)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}

	booking, err := h.service.GetDetailForCustomer(c.Request.Context(), id, tenantID, customerID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "BOOKING TIDAK DITEMUKAN"})
		return
	}
	c.JSON(http.StatusOK, booking)
}

func (h *Handler) GetCustomerResources(c *gin.Context) {
	tenantID := c.MustGet("tenantID").(string)
	data, err := h.service.GetCustomerResources(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "GAGAL MENGAMBIL KATALOG"})
		return
	}
	c.JSON(http.StatusOK, data)
}

func (h *Handler) GetCustomerFnb(c *gin.Context) {
	tenantID := c.MustGet("tenantID").(string)
	search := c.Query("q")
	items, err := h.service.GetCustomerFnbMenu(c.Request.Context(), tenantID, search)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "GAGAL MENGAMBIL MENU"})
		return
	}
	c.JSON(http.StatusOK, items)
}

func (h *Handler) CustomerBookingAvailability(c *gin.Context) {
	tenantID := optionalTenantID(c)
	bookingID := c.Param("id")
	dateStr := c.Query("date")
	targetDate, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		targetDate = time.Now()
	}
	customerIDValue, exists := c.Get("customerID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}
	customerID, ok := customerIDValue.(string)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}
	busy, err := h.service.GetCustomerAvailabilityByBooking(c.Request.Context(), bookingID, tenantID, customerID, targetDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "GAGAL MENGAMBIL DATA JADWAL"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"busy_slots": busy})
}

func (h *Handler) GetCustomerLiveSnapshot(c *gin.Context) {
	tenantID := optionalTenantID(c)
	customerIDValue, exists := c.Get("customerID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}
	customerID, ok := customerIDValue.(string)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}
	bookingID := c.Param("id")
	date := time.Now()
	if dateStr := c.Query("date"); dateStr != "" {
		if parsed, err := time.Parse("2006-01-02", dateStr); err == nil {
			date = parsed
		}
	}
	snapshot, err := h.service.GetCustomerLiveSnapshot(c.Request.Context(), bookingID, tenantID, customerID, date)
	if err != nil {
		if err.Error() == "LIVE CONTROLLER HANYA BISA DIAKSES SAAT SESI AKTIF" {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "GAGAL MENGAMBIL SNAPSHOT BOOKING"})
		return
	}
	c.JSON(http.StatusOK, snapshot)
}

func (h *Handler) CustomerExtendSession(c *gin.Context) {
	bookingID := c.Param("id")
	tenantID := optionalTenantID(c)
	customerIDValue, exists := c.Get("customerID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}
	customerID, ok := customerIDValue.(string)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}

	var req struct {
		AdditionalDuration int `json:"additional_duration" binding:"required,min=1"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "DURASI MINIMAL 1 SESI"})
		return
	}
	if err := h.service.CustomerExtendSession(c.Request.Context(), bookingID, tenantID, customerID, req.AdditionalDuration); err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "DURASI BERHASIL DIPERPANJANG"})
}

func (h *Handler) CustomerAddOrder(c *gin.Context) {
	bookingID := c.Param("id")
	tenantID := optionalTenantID(c)
	customerIDValue, exists := c.Get("customerID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}
	customerID, ok := customerIDValue.(string)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}

	var req AddOrderReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "DATA PESANAN TIDAK VALID"})
		return
	}
	if err := h.service.CustomerAddFnbOrder(c.Request.Context(), bookingID, tenantID, customerID, req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "PESANAN BERHASIL DITAMBAHKAN"})
}

func (h *Handler) CustomerAddAddonItem(c *gin.Context) {
	bookingID := c.Param("id")
	tenantID := optionalTenantID(c)
	customerIDValue, exists := c.Get("customerID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}
	customerID, ok := customerIDValue.(string)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}

	var req struct {
		ItemID string `json:"item_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ITEM ID WAJIB DIISI"})
		return
	}
	if err := h.service.CustomerAddAddonOrder(c.Request.Context(), bookingID, tenantID, customerID, req.ItemID); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "LAYANAN TAMBAHAN DITAMBAHKAN"})
}

func (h *Handler) CustomerActivate(c *gin.Context) {
	bookingID := c.Param("id")
	tenantID := optionalTenantID(c)
	customerIDValue, exists := c.Get("customerID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}
	customerID, ok := customerIDValue.(string)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}

	booking, err := h.service.ActivateForCustomer(c.Request.Context(), bookingID, tenantID, customerID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, booking)
}

func (h *Handler) CustomerCompleteSession(c *gin.Context) {
	bookingID := c.Param("id")
	tenantID := optionalTenantID(c)
	customerIDValue, exists := c.Get("customerID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}
	customerID, ok := customerIDValue.(string)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}

	booking, err := h.service.CompleteForCustomer(c.Request.Context(), bookingID, tenantID, customerID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, booking)
}

func (h *Handler) GetPublicDetailByToken(c *gin.Context) {
	token := c.Param("id")
	if _, err := uuid.Parse(token); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "TOKEN AKSES TIDAK VALID"})
		return
	}

	booking, err := h.service.GetStatusByToken(c.Request.Context(), token)
	if err != nil || booking == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "RESERVASI TIDAK DITEMUKAN"})
		return
	}
	c.JSON(http.StatusOK, booking)
}

func (h *Handler) SyncSession(c *gin.Context) {
	bookingID := c.Param("id")
	tenantID := optionalTenantID(c)
	booking, err := h.service.SyncSessionState(c.Request.Context(), bookingID, tenantID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, booking)
}

func optionalTenantID(c *gin.Context) string {
	if tenantID, exists := c.Get("tenantID"); exists {
		if tenantIDStr, ok := tenantID.(string); ok {
			return tenantIDStr
		}
	}
	return ""
}

// UpdateStatus eksekusi transisi status (Check-out, Cancel, dll)
func (h *Handler) UpdateStatus(c *gin.Context) {
	id := c.Param("id")
	tenantID := c.MustGet("tenantID").(string)

	statusValue, exists := c.Get("bookingStatusRequest")
	if !exists {
		var req struct {
			Status string `json:"status" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "STATUS TIDAK VALID"})
			return
		}
		statusValue = req.Status
	}

	status, _ := statusValue.(string)
	if status == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "STATUS TIDAK VALID"})
		return
	}

	err := h.service.UpdateStatus(c.Request.Context(), id, tenantID, status, "admin")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "GAGAL UPDATE STATUS"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "STATUS BERHASIL DIPERBARUI"})
}

func (h *Handler) SettleCash(c *gin.Context) {
	id := c.Param("id")
	tenantID := c.MustGet("tenantID").(string)
	if err := h.service.SettleCash(c.Request.Context(), id, tenantID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "PEMBAYARAN CASH BERHASIL DILUNASI"})
}

func (h *Handler) SendReceiptWhatsApp(c *gin.Context) {
	id := c.Param("id")
	tenantID := c.MustGet("tenantID").(string)
	result, err := h.service.SendReceiptWhatsApp(c.Request.Context(), id, tenantID)
	if err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}
