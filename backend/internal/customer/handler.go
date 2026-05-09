package customer

import (
	"errors"
	"mime/multipart"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/helwiza/backend/internal/platform/fonnte"
	"github.com/helwiza/backend/internal/platform/storage"
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
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nomor WhatsApp wajib diisi"})
		return
	}

	err := h.service.RequestOTP(c.Request.Context(), req.Phone)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Kode verifikasi sudah dikirim ke WhatsApp kamu"})
}

func (h *Handler) ResendRegistrationOTP(c *gin.Context) {
	var req LoginReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nomor WhatsApp wajib diisi"})
		return
	}

	if err := h.service.ResendRegistrationOTP(c.Request.Context(), req.Phone); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "OTP aktivasi baru sudah kami kirim ke WhatsApp kamu"})
}

// VerifyOTP memvalidasi kode dan mengembalikan JWT Token
func (h *Handler) VerifyOTP(c *gin.Context) {
	var req VerifyOtpReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Kode verifikasi belum lengkap"})
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Sesi belum berhasil dibuat. Silakan coba lagi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token":    tokenString,
		"customer": cust,
	})
}

func (h *Handler) CustomerLoginEmail(c *gin.Context) {
	var req struct {
		Email    string `json:"email" binding:"required"`
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email dan password wajib diisi"})
		return
	}

	cust, err := h.service.LoginWithEmail(c.Request.Context(), req.Email, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	tokenString, err := GenerateAuthToken(cust.ID.String(), "", "", time.Hour*72)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Sesi belum berhasil dibuat. Silakan coba lagi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token":    tokenString,
		"customer": cust,
	})
}

func (h *Handler) CustomerGoogleLogin(c *gin.Context) {
	var req GoogleLoginReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Token Google wajib diisi"})
		return
	}

	result, err := h.service.LoginWithGoogle(c.Request.Context(), req.IDToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	if result.Status != "authenticated" || result.Customer == nil {
		c.JSON(http.StatusOK, result)
		return
	}

	tokenString, err := GenerateAuthToken(result.Customer.ID.String(), "", "", time.Hour*72)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Sesi Google belum berhasil dibuat. Silakan coba lagi"})
		return
	}

	result.Token = tokenString
	c.JSON(http.StatusOK, result)
}

func (h *Handler) CustomerGoogleClaim(c *gin.Context) {
	var req GoogleClaimReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data claim Google belum lengkap"})
		return
	}

	cust, err := h.service.ClaimGoogleAccount(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "Kami kirim OTP ke WhatsApp kamu untuk menyelesaikan claim akun Google.",
		"phone":    cust.Phone,
		"customer": cust,
	})
}

func (h *Handler) RequestPasswordResetOTP(c *gin.Context) {
	var req RequestPasswordResetReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nomor WhatsApp wajib diisi"})
		return
	}

	if err := h.service.RequestPasswordResetOTP(c.Request.Context(), req.Phone); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Kode reset password sudah dikirim ke WhatsApp kamu"})
}

func (h *Handler) VerifyPasswordResetOTP(c *gin.Context) {
	var req VerifyPasswordResetReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data reset password belum lengkap"})
		return
	}

	if err := h.service.VerifyPasswordResetOTP(c.Request.Context(), req.Phone, req.Code, req.NewPassword); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password berhasil direset. Silakan login dengan password baru"})
}

func (h *Handler) CustomerRegister(c *gin.Context) {
	var req RegisterReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data pendaftaran belum lengkap"})
		return
	}

	if req.Phone == "" || req.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nama lengkap dan nomor WhatsApp wajib diisi"})
		return
	}

	cust, err := h.service.StartRegistration(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "Pendaftaran hampir selesai. Verifikasi WhatsApp untuk mengaktifkan akun Bookinaja kamu.",
		"phone":    cust.Phone,
		"customer": cust,
	})
}

func (h *Handler) CustomerClaimAccount(c *gin.Context) {
	var req RegisterReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data claim akun belum lengkap"})
		return
	}
	if req.Phone == "" || req.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nama lengkap dan nomor WhatsApp wajib diisi"})
		return
	}

	cust, err := h.service.StartRegistration(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "Kami kirim OTP untuk claim akun kamu. Verifikasi dulu agar akun Bookinaja aktif penuh.",
		"phone":    cust.Phone,
		"customer": cust,
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

func (h *Handler) UpdateMyPassword(c *gin.Context) {
	customerIDStr, exists := c.Get("customerID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid, silakan login kembali"})
		return
	}

	var req UpdatePasswordReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data password tidak valid"})
		return
	}

	updated, err := h.service.UpdatePassword(c.Request.Context(), customerIDStr.(string), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password berhasil diperbarui", "customer": updated})
}

func (h *Handler) LinkMyGoogle(c *gin.Context) {
	customerIDStr, exists := c.Get("customerID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid, silakan login kembali"})
		return
	}

	var req GoogleLoginReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Token Google wajib diisi"})
		return
	}

	updated, err := h.service.LinkGoogleForCustomer(c.Request.Context(), customerIDStr.(string), req.IDToken)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Akun Google berhasil dihubungkan", "customer": updated})
}

func (h *Handler) RequestMyPhoneChange(c *gin.Context) {
	customerIDStr, exists := c.Get("customerID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid, silakan login kembali"})
		return
	}

	var req RequestPhoneChangeReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nomor WhatsApp baru wajib diisi"})
		return
	}

	if err := h.service.RequestPhoneChangeOTP(c.Request.Context(), customerIDStr.(string), req.NewPhone); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "OTP pergantian nomor sudah dikirim ke WhatsApp baru kamu"})
}

func (h *Handler) VerifyMyPhoneChange(c *gin.Context) {
	customerIDStr, exists := c.Get("customerID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid, silakan login kembali"})
		return
	}

	var req VerifyPhoneChangeReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data verifikasi nomor belum lengkap"})
		return
	}

	updated, err := h.service.VerifyPhoneChangeOTP(c.Request.Context(), customerIDStr.(string), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Nomor WhatsApp berhasil diperbarui", "customer": updated})
}

func (h *Handler) UploadMyAvatar(c *gin.Context) {
	customerIDStr, exists := c.Get("customerID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid, silakan login kembali"})
		return
	}

	file, err := firstImageFormFile(c, "image", "file", "avatar")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File avatar tidak ditemukan"})
		return
	}
	if err := validateAvatarUpload(file); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	s3, err := storage.NewS3Client()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal inisialisasi storage"})
		return
	}

	url, err := s3.UploadFile(c.Request.Context(), file, "customers/avatars/"+customerIDStr.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal upload foto profil"})
		return
	}

	updated, err := h.service.UpdateAccount(c.Request.Context(), customerIDStr.(string), UpdateProfileReq{
		AvatarURL: &url,
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "Foto profil berhasil diperbarui",
		"url":       url,
		"mime_type": strings.ToLower(strings.TrimSpace(file.Header.Get("Content-Type"))),
		"size":      file.Size,
		"customer":  updated,
	})
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

func (h *Handler) ImportCustomers(c *gin.Context) {
	var req struct {
		Rows []CustomerImportRow `json:"rows"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format import pelanggan tidak valid"})
		return
	}

	tenantID := c.MustGet("tenantID").(string)
	actorID, _ := uuid.Parse(c.GetString("userID"))
	result, err := h.service.ImportCustomers(c.Request.Context(), actorID, tenantID, req.Rows)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

func (h *Handler) ListLegacyContacts(c *gin.Context) {
	tenantID := c.MustGet("tenantID").(string)
	items, err := h.service.ListLegacyContacts(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
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

func (h *Handler) Count(c *gin.Context) {
	tenantID := c.MustGet("tenantID").(string)
	total, err := h.service.CountByTenant(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"count": total})
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

func (h *Handler) GetPoints(c *gin.Context) {
	id := c.Param("id")
	tenantID := c.MustGet("tenantID").(string)
	limit := 20
	if raw := c.Query("limit"); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil {
			limit = parsed
		}
	}

	points, err := h.service.GetPointSummary(c.Request.Context(), id, tenantID, limit)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Riwayat poin tidak ditemukan"})
		return
	}

	c.JSON(http.StatusOK, points)
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

func firstImageFormFile(c *gin.Context, keys ...string) (*multipart.FileHeader, error) {
	for _, key := range keys {
		file, err := c.FormFile(key)
		if err == nil {
			return file, nil
		}
	}
	return nil, http.ErrMissingFile
}

func validateAvatarUpload(file *multipart.FileHeader) error {
	contentType := strings.ToLower(strings.TrimSpace(file.Header.Get("Content-Type")))
	if !strings.HasPrefix(contentType, "image/") {
		return errors.New("foto profil harus berupa gambar")
	}
	if file.Size <= 0 {
		return errors.New("ukuran foto profil tidak valid")
	}
	const maxImageBytes = 5 * 1024 * 1024
	if file.Size > maxImageBytes {
		return errors.New("ukuran gambar melebihi 5MB")
	}
	return nil
}
