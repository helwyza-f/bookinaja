package tenant

import (
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/helwiza/saas/internal/platform/storage"
)

type Handler struct {
	service *Service
}

func NewHandler(s *Service) *Handler {
	return &Handler{service: s}
}

// GetPublicLandingData mengambil profil bisnis dan daftar unit (Teroptimasi Redis)
func (h *Handler) GetPublicLandingData(c *gin.Context) {
	var slug string

	// 1. Prioritas 1: Ambil slug dari context middleware (paling akurat dari subdomain)
	tenantSlugRaw, exists := c.Get("tenantSlug")
	if exists {
		slug = tenantSlugRaw.(string)
	} else {
		// 2. Prioritas 2: Fallback ke query param ?slug=...
		slugParam := c.Query("slug")
		if slugParam == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Identitas bisnis (slug) diperlukan"})
			return
		}
		// Bersihkan jika isinya full domain (misal: gaming.bookinaja.local -> gaming)
		slug = strings.Split(slugParam, ".")[0]
	}

	// 3. Panggil Service (Sudah terintegrasi Redis Cache-Aside)
	data, err := h.service.GetPublicLandingData(c.Request.Context(), strings.ToLower(slug))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": fmt.Sprintf("Bisnis '%s' tidak ditemukan atau belum aktif", slug),
		})
		return
	}

	c.JSON(http.StatusOK, data)
}

// Register menangani pendaftaran tenant baru (Owner)
func (h *Handler) Register(c *gin.Context) {
	var req RegisterReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data registrasi tidak lengkap atau format salah"})
		return
	}

	t, err := h.service.Register(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}

	protocol := os.Getenv("APP_PROTOCOL") // http atau https
	appDomain := os.Getenv("APP_DOMAIN")   // bookinaja.com

	c.JSON(http.StatusCreated, gin.H{
		"message":   "Registrasi berhasil, selamat datang!",
		"tenant":    t,
		"login_url": fmt.Sprintf("%s://%s.%s/admin/login", protocol, t.Slug, appDomain),
	})
}

// Login menangani autentikasi Admin/Owner Dashboard
func (h *Handler) Login(c *gin.Context) {
	var req LoginReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email dan password wajib diisi"})
		return
	}

	resp, err := h.service.Login(c.Request.Context(), req.Email, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Email atau password salah"})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// GetProfile mengambil data profil internal tenant untuk Dashboard Admin
func (h *Handler) GetProfile(c *gin.Context) {
	tIDRaw, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}

	tID, _ := uuid.Parse(tIDRaw.(string))
	p, err := h.service.GetProfile(c.Request.Context(), tID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Gagal mengambil profil bisnis"})
		return
	}
	c.JSON(http.StatusOK, p)
}

// UpdateProfile memperbarui identitas visual, warna brand, dan kontak bisnis
func (h *Handler) UpdateProfile(c *gin.Context) {
	tIDRaw, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}

	tID, _ := uuid.Parse(tIDRaw.(string))

	var req Tenant
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format data update tidak valid"})
		return
	}

	updated, err := h.service.UpdateProfile(c.Request.Context(), tID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Profil berhasil diperbarui dan dipublikasikan",
		"data":    updated,
	})
}

// UploadImage menangani upload logo/banner/gallery ke S3 bucket
func (h *Handler) UploadImage(c *gin.Context) {
	file, err := c.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File gambar tidak ditemukan dalam request"})
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Layanan cloud storage bermasalah"})
		return
	}

	// Path: tenants/[UUID]/[filename]
	url, err := s3Provider.UploadFile(c.Request.Context(), file, "tenants/"+tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan gambar ke cloud"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Gambar berhasil diupload",
		"url":     url,
	})
}