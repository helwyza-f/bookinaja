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

// --- PUBLIC ENDPOINTS (Tanpa Auth) ---

// Create menangani pembuatan booking baru dari halaman publik atau admin manual
func (h *Handler) Create(c *gin.Context) {
	var req CreateBookingReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "LENGKAPI DATA BOOKING"})
		return
	}

	// Jika admin yang buat, tenantID diambil dari context auth middleware
	if req.TenantID == "" {
		if tID, exists := c.Get("tenantID"); exists {
			req.TenantID = tID.(string)
		}
	}

	b, err := h.service.Create(c.Request.Context(), req)
	if err != nil {
		// Gunakan Conflict (409) jika slot waktu sudah terisi
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":      "BOOKING BERHASIL",
		"booking_id":   b.ID,
		"access_token": b.AccessToken,
		"redirect_url": "/status/" + b.AccessToken.String(),
	})
}

// Availability mengecek slot waktu yang sudah terisi (Busy Slots) untuk Scheduler di POS/Public
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"busy_slots": busy})
}

// Status mengambil detail booking berdasarkan Access Token (Tampilan Guest/Status Page)
func (h *Handler) Status(c *gin.Context) {
	token := c.Param("token")
	b, err := h.service.GetStatusByToken(c.Request.Context(), token)
	if err != nil || b == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Detail booking tidak ditemukan"})
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
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
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data pesanan tidak valid"})
		return
	}

	err := h.service.AddFnbOrder(c.Request.Context(), bookingID, tenantID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Pesanan berhasil ditambahkan ke bill"})
}

// ExtendSession menangani permintaan perpanjangan durasi dari POS Control (Extend Dialog)
// Kini sudah menyertakan update Bill otomatis melalui Service & Repository logic terbaru
func (h *Handler) ExtendSession(c *gin.Context) {
	bookingID := c.Param("id")
	tenantID := c.MustGet("tenantID").(string)

	var req struct {
		AdditionalDuration int `json:"additional_duration" binding:"required,min=1"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Input durasi tidak valid"})
		return
	}

	err := h.service.ExtendSession(c.Request.Context(), bookingID, tenantID, req.AdditionalDuration)
	if err != nil {
		// Conflict (409) memberitahu frontend bahwa perpanjangan gagal karena jadwal bentrok
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Sesi berhasil diperpanjang dan bill diperbarui"})
}

// AddAddonItem menambahkan layanan/alat tambahan ke billing sesi berjalan (Add-on Dialog)
func (h *Handler) AddAddonItem(c *gin.Context) {
	bookingID := c.Param("id")
	tenantID := c.MustGet("tenantID").(string)

	var req struct {
		ItemID string `json:"item_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Item ID wajib diisi"})
		return
	}

	err := h.service.AddAddonOrder(c.Request.Context(), bookingID, tenantID, req.ItemID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Layanan tambahan berhasil ditambahkan"})
}

// GetDetail mengambil rincian lengkap (F&B, Add-ons, Bill Summary, dan Scheduler data)
// Digunakan untuk mengisi Panel Kanan POS Control Hub
func (h *Handler) GetDetail(c *gin.Context) {
	id := c.Param("id")
	tenantID := c.MustGet("tenantID").(string)

	booking, err := h.service.GetDetailForAdmin(c.Request.Context(), id, tenantID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Booking tidak ditemukan"})
		return
	}
	c.JSON(http.StatusOK, booking)
}

// UpdateStatus memperbarui status booking (Check-out manual, Complete, atau Cancel)
func (h *Handler) UpdateStatus(c *gin.Context) {
	id := c.Param("id")
	tenantID := c.MustGet("tenantID").(string)
	
	var req struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Status wajib diisi"})
		return
	}

	err := h.service.UpdateStatus(c.Request.Context(), id, tenantID, req.Status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Status berhasil diperbarui ke " + req.Status})
}