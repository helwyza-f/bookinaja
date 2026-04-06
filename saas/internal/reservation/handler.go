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

// --- PUBLIC ENDPOINTS (Tanpa Auth / Customer Facing) ---

// Create menangani pembuatan booking baru dari halaman publik atau admin manual
func (h *Handler) Create(c *gin.Context) {
	var req CreateBookingReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "LENGKAPI DATA BOOKING DENGAN BENAR"})
		return
	}

	// Logic: TenantID sekarang bersifat opsional di JSON karena Service akan mencarinya 
	// otomatis berdasarkan ResourceID. Namun jika Admin yang buat (via Dashboard), 
	// kita tetap bisa ambil dari context middleware jika diperlukan.

	b, err := h.service.Create(c.Request.Context(), req)
	if err != nil {
		// Jika terjadi bentrok jadwal, return 409 Conflict
		if err.Error() == "MAAF, SLOT WAKTU TERSEBUT SUDAH TERISI" {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":      "BOOKING BERHASIL DIBUAT",
		"booking_id":   b.ID,
		"access_token": b.AccessToken,
		"redirect_url": "/status/" + b.AccessToken.String(),
	})
}

func (h *Handler) Availability(c *gin.Context) {
	resourceID := c.Param("resource_id")
	dateStr := c.Query("date") // Format YYYY-MM-DD

	// Parse tanggal pencarian tanpa jam (Naive date)
	targetDate, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		targetDate = time.Now()
	}

	busy, err := h.service.GetAvailability(c.Request.Context(), resourceID, targetDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "GAGAL MENGAMBIL JADWAL"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"busy_slots": busy})
}

// Status mengambil detail booking berdasarkan Access Token (Tampilan Tiket Guest)
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

// GetActiveSessions mengambil sesi yang sedang berjalan (Active/Ongoing) untuk Dashboard POS
func (h *Handler) GetActiveSessions(c *gin.Context) {
	tenantID := c.MustGet("tenantID").(string)

	sessions, err := h.service.GetActiveSessions(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "GAGAL MENGAMBIL SESI AKTIF"})
		return
	}
	c.JSON(http.StatusOK, sessions)
}

// AddOrder menambahkan pesanan F&B ke billing bokingan yang sedang aktif (Integrasi POS)
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

// ExtendSession menangani permintaan penambahan durasi dari Dashboard POS
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
		// Return 409 Conflict jika slot tambahan sudah dibooking orang lain
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "SESI DIPERPANJANG & BILL DIUPDATE"})
}

// AddAddonItem menambahkan layanan tambahan (seperti sewa controller/VR) secara langsung
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

// GetDetail mengambil rincian lengkap billing untuk sidebar POS Control Hub
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

// UpdateStatus memperbarui status booking (Check-out, Ongoing, dll)
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