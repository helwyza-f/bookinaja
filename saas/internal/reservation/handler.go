package reservation

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	service *Service
}

func NewHandler(s *Service) *Handler {
	return &Handler{service: s}
}

// --- PUBLIC ENDPOINTS (Tanpa Auth / Admin Manual) ---

// Create menangani pembuatan booking baru dari halaman publik atau admin manual
func (h *Handler) Create(c *gin.Context) {
	var req CreateBookingReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "LENGKAPI DATA BOOKING DENGAN BENAR"})
		return
	}

	// Jika admin yang buat (via Dashboard), tenantID diambil dari context auth middleware
	if req.TenantID == "" {
		if tID, exists := c.Get("tenantID"); exists {
			req.TenantID = tID.(string)
		}
	}

	b, err := h.service.Create(c.Request.Context(), req)
	if err != nil {
		// Gunakan Conflict (409) jika slot waktu sudah terisi atau ada bentrok
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":      "BOOKING BERHASIL DIBUAT",
		"booking_id":   b.ID,
		"access_token": b.AccessToken,
		"redirect_url": "/status/" + b.AccessToken.String(),
	})
}

// Availability mengecek slot waktu yang sudah terisi (Busy Slots)
func (h *Handler) Availability(c *gin.Context) {
	resourceID := c.Param("resource_id")
	dateStr := c.Query("date")

	targetDate := time.Now()
	if dateStr != "" {
		if d, err := time.Parse("2006-01-02", dateStr); err == nil {
			targetDate = d
		}
	}

	busy, err := h.service.GetAvailability(c.Request.Context(), resourceID, targetDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "GAGAL MENGAMBIL DATA KETERSEDIAAN"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"busy_slots": busy})
}

// Status mengambil detail booking berdasarkan Access Token (Tampilan Guest)
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

// ListAll mengambil semua daftar booking untuk tabel Admin Panel
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

// GetActiveSessions mengambil sesi "Ongoing" untuk grid Live Sessions di POS
func (h *Handler) GetActiveSessions(c *gin.Context) {
	tenantID := c.MustGet("tenantID").(string)

	sessions, err := h.service.GetActiveSessions(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "GAGAL MENGAMBIL SESI AKTIF"})
		return
	}
	c.JSON(http.StatusOK, sessions)
}

// AddOrder menambahkan pesanan F&B ke billing sesi aktif (POS FnB Dialog)
func (h *Handler) AddOrder(c *gin.Context) {
	bookingID := c.Param("id")
	tenantID := c.MustGet("tenantID").(string)

	var req AddOrderReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "DATA PESANAN TIDAK VALID"})
		return
	}

	err := h.service.AddFnbOrder(c.Request.Context(), bookingID, tenantID, req)
	if err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "ITEM BERHASIL DITAMBAHKAN KE BILL"})
}

// ExtendSession menangani permintaan perpanjangan durasi dari POS Control
func (h *Handler) ExtendSession(c *gin.Context) {
	bookingID := c.Param("id")
	tenantID := c.MustGet("tenantID").(string)

	var req struct {
		AdditionalDuration int `json:"additional_duration" binding:"required,min=1"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "INPUT DURASI HARUS MINIMAL 1 SESI/JAM"})
		return
	}

	err := h.service.ExtendSession(c.Request.Context(), bookingID, tenantID, req.AdditionalDuration)
	if err != nil {
		// Return 409 Conflict agar UI tahu extension ditolak karena jadwal customer lain
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "SESI DIPERPANJANG & BILL DIUPDATE"})
}

// AddAddonItem menambahkan layanan tambahan ke billing sesi berjalan (Add-on Dialog)
func (h *Handler) AddAddonItem(c *gin.Context) {
	bookingID := c.Param("id")
	tenantID := c.MustGet("tenantID").(string)

	var req struct {
		ItemID string `json:"item_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ITEM ID TIDAK BOLEH KOSONG"})
		return
	}

	err := h.service.AddAddonOrder(c.Request.Context(), bookingID, tenantID, req.ItemID)
	if err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "ADD-ON BERHASIL DITAMBAHKAN"})
}

// GetDetail mengambil rincian lengkap untuk Panel Kanan POS Control Hub
func (h *Handler) GetDetail(c *gin.Context) {
	id := c.Param("id")
	tenantID := c.MustGet("tenantID").(string)

	booking, err := h.service.GetDetailForAdmin(c.Request.Context(), id, tenantID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "DATA BOOKING TIDAK DITEMUKAN"})
		return
	}
	c.JSON(http.StatusOK, booking)
}

// UpdateStatus memperbarui status booking (Check-out, Cancel, dll)
func (h *Handler) UpdateStatus(c *gin.Context) {
	id := c.Param("id")
	tenantID := c.MustGet("tenantID").(string)

	var req struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "STATUS TIDAK VALID"})
		return
	}

	err := h.service.UpdateStatus(c.Request.Context(), id, tenantID, req.Status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "GAGAL MEMPERBARUI STATUS"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "STATUS BERHASIL DIUBAH KE " + req.Status})
}