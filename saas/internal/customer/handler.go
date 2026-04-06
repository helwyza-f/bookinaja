package customer

import (
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/helwiza/saas/internal/platform/fonnte"
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

	// Ambil tenantID dari context (disuntikkan oleh TenantIdentifier middleware)
	tenantIDStr, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Identitas bisnis tidak ditemukan"})
		return
	}
	tID, _ := uuid.Parse(tenantIDStr.(string))

	err := h.service.RequestOTP(c.Request.Context(), tID, req.Phone)
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

	tenantIDStr := c.MustGet("tenantID").(string)
	tID, _ := uuid.Parse(tenantIDStr)

	// 1. Verifikasi kode via service (Redis check)
	cust, err := h.service.VerifyOTP(c.Request.Context(), tID, req.Phone, req.Code)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	// 2. Generate JWT khusus Customer (Berlaku 3 Hari)
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"customer_id": cust.ID.String(),
		"tenant_id":   cust.TenantID.String(),
		"exp":         time.Now().Add(time.Hour * 72).Unix(),
	})

	tokenString, err := token.SignedString([]byte(os.Getenv("JWT_SECRET")))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat sesi login"})
		return
	}

	c.JSON(http.StatusOK, AuthResponse{
		Token:    tokenString,
		Customer: *cust,
	})
}

// --- PORTAL & CRM ENDPOINTS (PROTECTED) ---

// GetMe mengambil data dashboard lengkap (Active Bookings & History)
func (h *Handler) GetMe(c *gin.Context) {
	// Diambil dari AuthMiddleware (customer_id)
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

	// Service sekarang mengembalikan data yang sudah dipisah (Active vs Past)
	data, err := h.service.GetDashboardData(c.Request.Context(), custID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, data)
}

// ValidatePhone untuk live validation nomor WA via Fonnte
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

// Create pendaftaran manual oleh Admin dari Dashboard CRM
func (h *Handler) Create(c *gin.Context) {
	var req RegisterReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format data pelanggan salah"})
		return
	}

	tenantID := c.MustGet("tenantID").(string)
	cust, err := h.service.Register(c.Request.Context(), tenantID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, cust)
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
	cust, err := h.service.GetDetail(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Pelanggan tidak ditemukan"})
		return
	}

	c.JSON(http.StatusOK, cust)
}

// SearchByPhone pencarian atau registrasi otomatis di Point of Sale (POS)
func (h *Handler) SearchByPhone(c *gin.Context) {
	phone := c.Query("phone")
	if phone == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nomor HP wajib diisi"})
		return
	}

	tenantID := c.MustGet("tenantID").(string)
	cust, err := h.service.Register(c.Request.Context(), tenantID, RegisterReq{
		Phone: phone,
		Name:  "Customer", // Default name untuk silent registration
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, cust)
}