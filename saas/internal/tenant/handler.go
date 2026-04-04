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

// GetPublicLandingData mengambil profil bisnis dan daftar unit untuk halaman depan pelanggan
func (h *Handler) GetPublicLandingData(c *gin.Context) {
	slug := c.Query("slug")
	if slug == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "slug is required"})
		return
	}

	// Membersihkan slug dari kemungkinan subdomain/domain penuh
	cleanSlug := strings.Split(slug, ".")[0]

	tenant, err := h.service.repo.GetBySlug(c.Request.Context(), cleanSlug)
	if err != nil || tenant == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Bisnis tidak ditemukan"})
		return
	}

	// Mengambil resources lengkap dengan items (JSON agg dari repo)
	resources, err := h.service.repo.ListResourcesWithItems(c.Request.Context(), tenant.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data unit"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"profile":   tenant,
		"resources": resources,
	})
}

// Register menangani pendaftaran tenant baru (Owner)
func (h *Handler) Register(c *gin.Context) {
	var req RegisterReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Service.Register sekarang sudah mencakup Seeding Template secara otomatis
	t, err := h.service.Register(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}

	protocol := os.Getenv("APP_PROTOCOL") // misal: "https" atau "http"
	appDomain := os.Getenv("APP_DOMAIN")   // misal: "bookinaja.com" atau "localhost:3000"

	// login_url diarahkan ke halaman login admin di subdomain bisnis baru
	c.JSON(http.StatusCreated, gin.H{
		"tenant":    t,
		"login_url": fmt.Sprintf("%s://%s.%s/admin/login", protocol, t.Slug, appDomain),
	})
}

// Login menangani autentikasi dan pembuatan token JWT
func (h *Handler) Login(c *gin.Context) {
	var req LoginReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.service.Login(c.Request.Context(), req.Email, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// GetProfile mengambil profil detail tenant berdasarkan token login
func (h *Handler) GetProfile(c *gin.Context) {
	tIDRaw, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	tID, err := uuid.Parse(tIDRaw.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Tenant ID"})
		return
	}

	p, err := h.service.GetProfile(c.Request.Context(), tID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, p)
}

// UpdateProfile memperbarui informasi bisnis tenant
func (h *Handler) UpdateProfile(c *gin.Context) {
	tIDRaw, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	tID, err := uuid.Parse(tIDRaw.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Tenant ID"})
		return
	}

	var req Tenant
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updated, err := h.service.UpdateProfile(c.Request.Context(), tID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, updated)
}

// UploadImage menangani upload logo/banner ke S3 storage

func (h *Handler) UploadImage(c *gin.Context) {
	file, err := c.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tidak ada gambar yang diupload"})
		return
	}

	tenantID := c.MustGet("tenantID").(string)

	s3Provider, err := storage.NewS3Client()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Storage provider error"})
		return
	}

	// File disimpan di path: tenants/{tenantID}/{filename}
	url, err := s3Provider.UploadFile(c.Request.Context(), file, "tenants/"+tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengupload gambar"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"url": url})
}