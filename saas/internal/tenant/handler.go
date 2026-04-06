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
	var tID uuid.UUID
	var tenant *Tenant
	var err error

	// 1. Cek apakah middleware TenantIdentifier sudah dapetin ID dari Subdomain/Redis
	tenantIDRaw, exists := c.Get("tenantID")
	
	if exists {
		// Jika ada di context, parse UUID-nya
		tID, _ = uuid.Parse(tenantIDRaw.(string))
		
		// Tarik profile berdasarkan ID (Lebih akurat & kena cache di middleware tadi)
		tenant, err = h.service.repo.GetByID(c.Request.Context(), tID)
	} else {
		// 2. Fallback: Jika middleware tidak ada (misal bypass), cari lewat slug query
		slug := c.Query("slug")
		if slug == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Identitas bisnis (slug) diperlukan"})
			return
		}

		cleanSlug := strings.Split(slug, ".")[0]
		tenant, err = h.service.repo.GetBySlug(c.Request.Context(), cleanSlug)
		if tenant != nil {
			tID = tenant.ID
		}
	}

	// Cek apakah tenant beneran ketemu
	if err != nil || tenant == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Bisnis tidak ditemukan atau belum terdaftar"})
		return
	}

	// 3. Mengambil resources lengkap dengan items menggunakan ID yang valid
	resources, err := h.service.repo.ListResourcesWithItems(c.Request.Context(), tID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal sinkronisasi data unit"})
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

	t, err := h.service.Register(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}

	protocol := os.Getenv("APP_PROTOCOL")
	appDomain := os.Getenv("APP_DOMAIN")

	c.JSON(http.StatusCreated, gin.H{
		"tenant":    t,
		"login_url": fmt.Sprintf("%s://%s.%s/admin/login", protocol, t.Slug, appDomain),
	})
}

// Login menangani autentikasi Admin/Owner
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
	tIDRaw := c.MustGet("tenantID").(string)
	tID, _ := uuid.Parse(tIDRaw)

	p, err := h.service.GetProfile(c.Request.Context(), tID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, p)
}

// UpdateProfile memperbarui informasi bisnis tenant
func (h *Handler) UpdateProfile(c *gin.Context) {
	tIDRaw := c.MustGet("tenantID").(string)
	tID, _ := uuid.Parse(tIDRaw)

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

	url, err := s3Provider.UploadFile(c.Request.Context(), file, "tenants/"+tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengupload gambar"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"url": url})
}