package customer

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/helwiza/backend/internal/platform/fonnte"
)

type Handler struct {
	service *Service
}

func NewHandler(s *Service) *Handler {
	return &Handler{service: s}
}

// --- CUSTOMER AUTH ENDPOINTS (PUBLIC) ---

// RequestOTP mengirimkan kode verifikasi ke WhatsApp customer
func (h *Handler) RequestOTP(c *gin.Context) {
	var req LoginReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nomor WhatsApp diperlukan"})
		return
	}

	err := h.service.RequestOTP(c.Request.Context(), req.Phone)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Kode OTP telah dikirim ke WhatsApp Anda"})
}

// VerifyOTP memvalidasi kode dan mengembalikan JWT Token
func (h *Handler) VerifyOTP(c *gin.Context) {
	var req VerifyOtpReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data verifikasi tidak lengkap"})
		return
	}

	cust, err := h.service.VerifyOTP(c.Request.Context(), req.Phone, req.Code)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	// Generate JWT khusus Customer (Berlaku 3 Hari)
	tokenString, err := GenerateAuthToken(cust.ID.String(), "", "", time.Hour*72)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat sesi login"})
		return
	}

	c.JSON(http.StatusOK, AuthResponse{
		Token:    tokenString,
		Customer: *cust,
	})
}

// --- BOOKING FLOW VALIDATION (PUBLIC) ---

// ValidateCustomer mengecek nomor HP di public boking page sebelum checkout.
// Jika ketemu, balikin profil ringkas. Jika tidak, balikin null.
func (h *Handler) ValidateCustomer(c *gin.Context) {
	phone := c.Query("phone")
	if phone == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nomor HP diperlukan"})
		return
	}

	cust, err := h.service.CheckExistence(c.Request.Context(), phone)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal melakukan validasi data"})
		return
	}

	if cust == nil {
		c.JSON(http.StatusOK, nil) // Frontend akan tahu ini customer baru
		return
	}

	// Balikin data krusial untuk konfirmasi identitas di UI
	c.JSON(http.StatusOK, gin.H{
		"id":             cust.ID,
		"name":           cust.Name,
		"tier":           cust.Tier,
		"loyalty_points": cust.LoyaltyPoints,
	})
}

// --- PORTAL & CRM ENDPOINTS (PROTECTED) ---

// GetMe mengambil data dashboard lengkap (Active Bookings & History)
func (h *Handler) GetMe(c *gin.Context) {
	customerIDStr, exists := c.Get("customerID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid, silakan login kembali"})
		return
	}

	custID, err := uuid.Parse(customerIDStr.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID Pelanggan tidak valid"})
		return
	}

	data, err := h.service.GetDashboardData(c.Request.Context(), custID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, data)
}

// UpdateMe memperbarui profil customer global
func (h *Handler) UpdateMe(c *gin.Context) {
	customerIDStr, exists := c.Get("customerID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid, silakan login kembali"})
		return
	}

	var req UpdateProfileReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data profil tidak valid"})
		return
	}

	updated, err := h.service.UpdateAccount(c.Request.Context(), customerIDStr.(string), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Profil diperbarui", "customer": updated})
}

// ValidatePhone untuk live validation nomor WA via Fonnte API (Cek aktif/enggak)
func (h *Handler) ValidatePhone(c *gin.Context) {
	phone := c.Query("phone")
	if phone == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nomor WhatsApp wajib diisi"})
		return
	}

	isValid, err := fonnte.ValidateNumber(phone)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"valid": false,
			"error": "Gagal terhubung ke server WhatsApp",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"valid": isValid, "phone": phone})
}

// --- ADMIN CRM ENDPOINTS ---

// Create pendaftaran manual oleh Admin dari Dashboard CRM
func (h *Handler) Create(c *gin.Context) {
	var req RegisterReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format data pelanggan salah"})
		return
	}

	cust, err := h.service.Register(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, cust)
}

func (h *Handler) BlastAnnouncement(c *gin.Context) {
	var req BroadcastAnnouncementReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format pesan blast tidak valid"})
		return
	}

	tenantID := c.MustGet("tenantID").(string)
	actorID, _ := uuid.Parse(c.GetString("userID"))
	result, err := h.service.BlastAnnouncement(c.Request.Context(), actorID, tenantID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// List database pelanggan untuk Admin CRM (Sorted by Spending)
func (h *Handler) List(c *gin.Context) {
	tenantID := c.MustGet("tenantID").(string)
	customers, err := h.service.ListByTenant(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, customers)
}

// GetByID detail untuk Modal di Admin
func (h *Handler) GetByID(c *gin.Context) {
	id := c.Param("id")
	tenantID := c.MustGet("tenantID").(string)
	cust, err := h.service.GetDetail(c.Request.Context(), id, tenantID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Pelanggan tidak ditemukan"})
		return
	}

	c.JSON(http.StatusOK, cust)
}

func (h *Handler) GetHistory(c *gin.Context) {
	id := c.Param("id")
	tenantID := c.MustGet("tenantID").(string)
	limit := 20
	if raw := c.Query("limit"); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil {
			limit = parsed
		}
	}

	history, err := h.service.GetTransactionHistory(c.Request.Context(), id, tenantID, limit)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Riwayat transaksi tidak ditemukan"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"items": history})
}

// SearchByPhone digunakan untuk pencarian instan di POS kasir
func (h *Handler) SearchByPhone(c *gin.Context) {
	phone := c.Query("phone")
	if phone == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nomor HP wajib diisi"})
		return
	}

	// Cek apakah user sudah ada
	cust, err := h.service.GetByPhone(c.Request.Context(), phone)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if cust == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Customer belum terdaftar"})
		return
	}

	c.JSON(http.StatusOK, cust)
}
