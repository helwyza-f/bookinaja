package tenant

import (
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"github.com/helwiza/backend/internal/platform/env"
	"github.com/helwiza/backend/internal/platform/storage"
)

type Handler struct {
	service *Service
}

func NewHandler(s *Service) *Handler {
	return &Handler{service: s}
}

// GetIDBySlug adalah endpoint super ringan buat Axios Interceptor (VIP Path)
func (h *Handler) GetIDBySlug(c *gin.Context) {
	// Diambil dari TenantIdentifier Middleware
	tenantID, exists := c.Get("tenantID")
	if !exists || tenantID == "" {
		// Jika middleware gak nemu lewat header/query, kita coba fallback query di sini
		slug := c.Query("slug")
		if slug != "" {
			data, err := h.service.GetPublicProfile(c.Request.Context(), strings.ToLower(slug))
			if err == nil {
				c.JSON(http.StatusOK, gin.H{"id": data.ID})
				return
			}
		}
		c.JSON(http.StatusNotFound, gin.H{"error": "Tenant tidak ditemukan"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"id": tenantID})
}

// GetPublicProfile Baru: Khusus ambil data brand & tema (Gak pake join tabel berat)
func (h *Handler) GetPublicProfile(c *gin.Context) {
	slug := h.extractSlug(c)
	if slug == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Slug bisnis diperlukan"})
		return
	}

	// Ambil data profil saja (Cache-hit priority)
	data, err := h.service.GetPublicProfile(c.Request.Context(), strings.ToLower(slug))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Profil bisnis tidak ditemukan"})
		return
	}

	c.JSON(http.StatusOK, data)
}

// GetPublicLandingData mengambil full data (Legacy/Full Load)
func (h *Handler) GetPublicLandingData(c *gin.Context) {
	slug := h.extractSlug(c)
	if slug == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Identitas bisnis diperlukan"})
		return
	}

	data, err := h.service.GetPublicLandingData(c.Request.Context(), strings.ToLower(slug))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Data bisnis tidak lengkap"})
		return
	}

	c.JSON(http.StatusOK, data)
}

func (h *Handler) ListPublicTenants(c *gin.Context) {
	items, err := h.service.ListPublicTenants(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil daftar tenant"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *Handler) PublicDiscoverFeed(c *gin.Context) {
	feed, err := h.service.GetPublicDiscoverFeed(c.Request.Context())
	if err != nil {
		log.Printf("public discover feed error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil feed discovery"})
		return
	}

	c.JSON(http.StatusOK, feed)
}

func (h *Handler) TrackDiscoveryEvent(c *gin.Context) {
	var req DiscoveryEventReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "payload analytics tidak valid"})
		return
	}

	if err := h.service.TrackDiscoveryEvent(c.Request.Context(), req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "event discovery dicatat"})
}

// extractSlug helper biar gak nulis berkali-kali
func (h *Handler) extractSlug(c *gin.Context) string {
	// Cek Query Param ?slug=
	if slug := c.Query("slug"); slug != "" {
		return strings.Split(slug, ".")[0]
	}
	// Cek Context dari middleware (jika ada)
	if slug, exists := c.Get("tenantSlug"); exists {
		return slug.(string)
	}
	return ""
}

// Register menangani pendaftaran tenant baru
func (h *Handler) Register(c *gin.Context) {
	var req RegisterReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data registrasi tidak lengkap"})
		return
	}

	t, err := h.service.Register(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":   "Registrasi berhasil!",
		"tenant":    t,
		"login_url": env.TenantURL(t.Slug, "/admin/login"),
	})
}

// Login menangani autentikasi Dashboard Admin
func (h *Handler) Login(c *gin.Context) {
	var req LoginReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email dan password wajib diisi"})
		return
	}

	tenantSlug := strings.TrimSpace(strings.ToLower(req.TenantSlug))
	if tenantSlug == "" {
		if slug, exists := c.Get("tenantSlug"); exists {
			tenantSlug, _ = slug.(string)
		}
	}

	resp, err := h.service.Login(c.Request.Context(), req.Email, req.Password, tenantSlug)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Email atau password salah"})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// GetProfile (Dashboard Internal)
func (h *Handler) GetProfile(c *gin.Context) {
	tIDRaw, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}

	tID, _ := uuid.Parse(tIDRaw.(string))
	p, err := h.service.GetProfile(c.Request.Context(), tID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Gagal mengambil profil"})
		return
	}
	c.JSON(http.StatusOK, p)
}

func (h *Handler) GetReceiptSettings(c *gin.Context) {
	tIDRaw, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}
	tID, _ := uuid.Parse(tIDRaw.(string))
	p, err := h.service.GetReceiptSettings(c.Request.Context(), tID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Gagal mengambil pengaturan nota"})
		return
	}
	c.JSON(http.StatusOK, p)
}

// UpdateProfile
func (h *Handler) UpdateProfile(c *gin.Context) {
	tIDRaw, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}
	actorRaw := c.GetString("userID")

	tID, _ := uuid.Parse(tIDRaw.(string))
	actorID, _ := uuid.Parse(actorRaw)
	var req Tenant
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format data tidak valid"})
		return
	}

	updated, err := h.service.UpdateProfile(c.Request.Context(), actorID, tID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Profil diperbarui", "data": updated})
}

func (h *Handler) UpdateReceiptSettings(c *gin.Context) {
	tIDRaw, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}
	actorRaw := c.GetString("userID")

	tID, _ := uuid.Parse(tIDRaw.(string))
	actorID, _ := uuid.Parse(actorRaw)
	var req Tenant
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format data tidak valid"})
		return
	}

	updated, err := h.service.UpdateReceiptSettings(c.Request.Context(), actorID, tID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Pengaturan nota diperbarui", "data": updated})
}

func (h *Handler) GetReferralSummary(c *gin.Context) {
	tIDRaw, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}
	tID, _ := uuid.Parse(tIDRaw.(string))
	summary, err := h.service.GetReferralSummary(c.Request.Context(), tID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, summary)
}

func (h *Handler) ListReferrals(c *gin.Context) {
	tIDRaw, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}
	tID, _ := uuid.Parse(tIDRaw.(string))
	items, err := h.service.ListReferralFriends(c.Request.Context(), tID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data referral"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *Handler) RequestReferralWithdrawal(c *gin.Context) {
	tIDRaw, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}
	actorRaw := c.GetString("userID")
	tID, _ := uuid.Parse(tIDRaw.(string))
	actorID, _ := uuid.Parse(actorRaw)

	summary, err := h.service.GetReferralSummary(c.Request.Context(), tID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	amount, _ := summary["available_balance"].(int64)
	if amount <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "saldo referral belum tersedia"})
		return
	}
	req, err := h.service.RequestReferralWithdrawal(c.Request.Context(), actorID, tID, amount, "Request pencairan referral")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "Pencairan referral masuk pending", "data": req})
}

func (h *Handler) ListReferralWithdrawals(c *gin.Context) {
	tIDRaw, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}
	tID, _ := uuid.Parse(tIDRaw.(string))
	items, err := h.service.ListReferralWithdrawals(c.Request.Context(), tID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data pencairan"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *Handler) UpdateReferralPayout(c *gin.Context) {
	tIDRaw, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}
	actorRaw := c.GetString("userID")
	tID, _ := uuid.Parse(tIDRaw.(string))
	actorID, _ := uuid.Parse(actorRaw)

	var req Tenant
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format data tidak valid"})
		return
	}
	updated, err := h.service.UpdateReferralPayout(c.Request.Context(), actorID, tID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Rekening pencairan diperbarui", "data": updated})
}

func (h *Handler) ListStaff(c *gin.Context) {
	tIDRaw, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}
	tID, _ := uuid.Parse(tIDRaw.(string))

	items, err := h.service.ListStaff(c.Request.Context(), tID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *Handler) ListStaffRoles(c *gin.Context) {
	tIDRaw, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}
	tID, _ := uuid.Parse(tIDRaw.(string))
	items, err := h.service.ListStaffRoles(c.Request.Context(), tID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *Handler) CreateStaffRole(c *gin.Context) {
	var req StaffRoleReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data role tidak lengkap"})
		return
	}
	tIDRaw, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}
	tID, _ := uuid.Parse(tIDRaw.(string))
	role, err := h.service.CreateStaffRole(c.Request.Context(), tID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, role)
}

func (h *Handler) UpdateStaffRole(c *gin.Context) {
	var req StaffRoleReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data role tidak lengkap"})
		return
	}
	tIDRaw, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}
	tID, _ := uuid.Parse(tIDRaw.(string))
	roleID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID role tidak valid"})
		return
	}
	role, err := h.service.UpdateStaffRole(c.Request.Context(), tID, roleID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, role)
}

func (h *Handler) DeleteStaffRole(c *gin.Context) {
	tIDRaw, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}
	tID, _ := uuid.Parse(tIDRaw.(string))
	roleID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID role tidak valid"})
		return
	}
	if err := h.service.DeleteStaffRole(c.Request.Context(), tID, roleID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Role dihapus"})
}

func (h *Handler) CreateStaff(c *gin.Context) {
	var req StaffCreateReq
	if err := c.ShouldBindJSON(&req); err != nil {
		if validationErrs, ok := err.(validator.ValidationErrors); ok {
			for _, validationErr := range validationErrs {
				switch validationErr.Field() {
				case "Name":
					c.JSON(http.StatusBadRequest, gin.H{"error": "Nama staff wajib diisi"})
				case "Email":
					c.JSON(http.StatusBadRequest, gin.H{"error": "Email staff wajib valid"})
				case "Password":
					c.JSON(http.StatusBadRequest, gin.H{"error": "Password staff minimal 6 karakter"})
				default:
					c.JSON(http.StatusBadRequest, gin.H{"error": "Data staff tidak valid"})
				}
				return
			}
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data staff tidak lengkap"})
		return
	}

	tIDRaw, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}
	tID, _ := uuid.Parse(tIDRaw.(string))

	actorID, _ := uuid.Parse(c.GetString("userID"))
	staff, err := h.service.CreateStaff(c.Request.Context(), actorID, tID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, staff)
}

func (h *Handler) UpdateStaff(c *gin.Context) {
	var req StaffUpdateReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data staff tidak valid"})
		return
	}
	tIDRaw, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}
	tID, _ := uuid.Parse(tIDRaw.(string))
	staffID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID pegawai tidak valid"})
		return
	}
	actorID, _ := uuid.Parse(c.GetString("userID"))
	updated, err := h.service.UpdateStaff(c.Request.Context(), actorID, tID, staffID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, updated)
}

func (h *Handler) GetStaffPermissions(c *gin.Context) {
	tIDRaw, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}
	tID, _ := uuid.Parse(tIDRaw.(string))
	staffID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID pegawai tidak valid"})
		return
	}

	items, err := h.service.GetStaffPermissions(c.Request.Context(), tID, staffID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *Handler) UpdateStaffPermissions(c *gin.Context) {
	var req StaffPermissionsReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data permission tidak valid"})
		return
	}

	tIDRaw, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}
	tID, _ := uuid.Parse(tIDRaw.(string))
	staffID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID pegawai tidak valid"})
		return
	}

	if err := h.service.UpdateStaffPermissions(c.Request.Context(), tID, staffID, req.PermissionKeys); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Permission staff diperbarui"})
}

func (h *Handler) DeleteStaff(c *gin.Context) {
	tIDRaw, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}
	actorID, _ := uuid.Parse(c.GetString("userID"))
	staffID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID pegawai tidak valid"})
		return
	}

	tID, _ := uuid.Parse(tIDRaw.(string))
	if err := h.service.DeleteStaff(c.Request.Context(), actorID, tID, staffID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Pegawai berhasil dihapus"})
}

func (h *Handler) ListActivity(c *gin.Context) {
	tIDRaw, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}
	tID, _ := uuid.Parse(tIDRaw.(string))

	limit := 20
	items, err := h.service.ListActivity(c.Request.Context(), tID, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"items": items})
}

// UploadImage ke S3 (R2)
func (h *Handler) UploadImage(c *gin.Context) {
	file, err := c.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Gambar tidak ditemukan"})
		return
	}

	tIDRaw, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}
	tenantID := tIDRaw.(string)

	s3Provider, err := storage.NewS3Client()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "S3 Client error"})
		return
	}

	url, err := s3Provider.UploadFile(c.Request.Context(), file, "tenants/"+tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Upload gagal"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"url": url})
}
