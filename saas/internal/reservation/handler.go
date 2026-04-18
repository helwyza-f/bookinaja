package reservation

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/helwiza/saas/internal/platform/security"
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

	// Memanggil service. Hasil kembalian menyertakan data Customer untuk generate JWT
	b, cust, err := h.service.Create(c.Request.Context(), req)
	if err != nil {
		// Jika terjadi bentrok jadwal, return 409 Conflict
		if err.Error() == "MAAF, SLOT WAKTU TERSEBUT SUDAH TERISI" {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// --- AUTO GENERATE JWT UNTUK SILENT LOGIN ---
	// Payload disamakan dengan modul customer.Service agar portal /me mengenali user ini
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"customer_id": cust.ID.String(),
		"tenant_id":   cust.TenantID.String(),
		"exp":         time.Now().Add(time.Hour * 72).Unix(), // Aktif 3 hari
	})

	tokenString, err := token.SignedString([]byte(security.JWTSecret()))
	if err != nil {
		// Tetap biarkan booking berhasil, tapi log error JWT-nya
		c.JSON(http.StatusCreated, gin.H{
			"message":      "BOOKING BERHASIL (Gagal login otomatis)",
			"booking_id":   b.ID,
			"redirect_url": "/me/bookings/" + b.ID.String(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":        "BOOKING BERHASIL",
		"booking_id":     b.ID,
		"booking":        b,
		"customer_token": tokenString,
		"redirect_url":   "/me/bookings/" + b.ID.String(),
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

	err := h.service.AddFnbOrder(c.Request.Context(), bookingID, tenantID, req)
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

	err := h.service.ExtendSession(c.Request.Context(), bookingID, tenantID, req.AdditionalDuration)
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

	err := h.service.AddAddonOrder(c.Request.Context(), bookingID, tenantID, req.ItemID)
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
	tenantID := c.MustGet("tenantID").(string)
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
	tenantID := c.MustGet("tenantID").(string)
	booking, err := h.service.SyncSessionState(c.Request.Context(), bookingID, tenantID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, booking)
}

// UpdateStatus eksekusi transisi status (Check-out, Cancel, dll)
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "GAGAL UPDATE STATUS"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "STATUS BERHASIL DIPERBARUI"})
}
