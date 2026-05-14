package tenant

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
	"net/url"
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

type PageBuilderUpdateReq struct {
	Page        LandingPageConfig  `json:"page"`
	Theme       LandingThemeConfig `json:"theme"`
	BookingForm BookingFormConfig  `json:"booking_form"`
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

func (h *Handler) PublicDiscoveryPostDetail(c *gin.Context) {
	postID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID postingan tidak valid"})
		return
	}

	detail, err := h.service.GetPublicDiscoveryPostDetail(c.Request.Context(), postID)
	if err != nil {
		log.Printf("public discovery post detail error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil detail postingan"})
		return
	}
	if detail == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Postingan tidak ditemukan"})
		return
	}

	c.JSON(http.StatusOK, detail)
}

func (h *Handler) CustomerDiscoverFeed(c *gin.Context) {
	customerIDStr, exists := c.Get("customerID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi customer tidak valid"})
		return
	}

	customerID, err := uuid.Parse(customerIDStr.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID customer tidak valid"})
		return
	}

	feed, err := h.service.GetCustomerDiscoverFeed(c.Request.Context(), customerID)
	if err != nil {
		log.Printf("customer discover feed error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil feed personalisasi"})
		return
	}

	c.JSON(http.StatusOK, feed)
}

func (h *Handler) OwnerDiscoverFeed(c *gin.Context) {
	tIDRaw, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}

	tenantID, err := uuid.Parse(tIDRaw.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tenant tidak valid"})
		return
	}

	feed, err := h.service.GetOwnerDiscoverFeed(c.Request.Context(), tenantID)
	if err != nil {
		log.Printf("owner discover feed error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil feed Bookinaja"})
		return
	}

	c.JSON(http.StatusOK, feed)
}

func (h *Handler) GetGrowthSettings(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"data": h.service.GetGrowthSettings(c.Request.Context()),
	})
}

func (h *Handler) ListTenantPosts(c *gin.Context) {
	tIDRaw, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}

	tenantID, err := uuid.Parse(tIDRaw.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tenant tidak valid"})
		return
	}

	posts, err := h.service.ListTenantPosts(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil postingan"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"items": posts})
}

func (h *Handler) CreateTenantPost(c *gin.Context) {
	tIDRaw, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}
	actorRaw := c.GetString("userID")

	tenantID, err := uuid.Parse(tIDRaw.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tenant tidak valid"})
		return
	}
	actorID, _ := uuid.Parse(actorRaw)

	var req TenantPostUpsertReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data postingan tidak valid"})
		return
	}

	post, err := h.service.CreateTenantPost(c.Request.Context(), actorID, tenantID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Postingan berhasil dibuat", "data": post})
}

func (h *Handler) UpdateTenantPost(c *gin.Context) {
	tIDRaw, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}
	actorRaw := c.GetString("userID")

	tenantID, err := uuid.Parse(tIDRaw.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tenant tidak valid"})
		return
	}
	postID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID postingan tidak valid"})
		return
	}
	actorID, _ := uuid.Parse(actorRaw)

	var req TenantPostUpsertReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data postingan tidak valid"})
		return
	}

	post, err := h.service.UpdateTenantPost(c.Request.Context(), actorID, tenantID, postID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Postingan berhasil diperbarui", "data": post})
}

func (h *Handler) DeleteTenantPost(c *gin.Context) {
	tIDRaw, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}
	actorRaw := c.GetString("userID")

	tenantID, err := uuid.Parse(tIDRaw.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tenant tidak valid"})
		return
	}
	postID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID postingan tidak valid"})
		return
	}
	actorID, _ := uuid.Parse(actorRaw)

	if err := h.service.DeleteTenantPost(c.Request.Context(), actorID, tenantID, postID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Postingan berhasil dihapus"})
}

func (h *Handler) TrackDiscoveryEvent(c *gin.Context) {
	raw, err := c.GetRawData()
	if err != nil || len(bytes.TrimSpace(raw)) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "payload analytics tidak valid"})
		return
	}

	payload := bytes.TrimSpace(raw)
	if len(payload) > 0 && payload[0] == '[' {
		var reqs []DiscoveryEventReq
		if err := json.Unmarshal(payload, &reqs); err != nil || len(reqs) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "payload analytics batch tidak valid"})
			return
		}
		if err := h.service.TrackDiscoveryEvents(c.Request.Context(), reqs); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, gin.H{"message": "batch discovery events dicatat", "count": len(reqs)})
		return
	}

	var req DiscoveryEventReq
	if err := json.Unmarshal(payload, &req); err != nil {
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

	result, err := h.service.Register(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}

	loginURL := env.PlatformURL("/admin/login")
	loginURL += "?tenant=" + url.QueryEscape(result.Tenant.Slug) + "&intent=admin&next=" + url.QueryEscape("/admin/dashboard") + "&welcome=1"

	c.JSON(http.StatusCreated, gin.H{
		"message":       result.Message,
		"tenant":        result.Tenant,
		"user":          result.User,
		"token":         result.Token,
		"login_url":     loginURL,
		"dashboard_url": env.TenantURL(result.Tenant.Slug, "/admin/dashboard"),
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
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (h *Handler) LoginGoogle(c *gin.Context) {
	var req LoginGoogleReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Token Google wajib diisi"})
		return
	}

	tenantSlug := strings.TrimSpace(strings.ToLower(req.TenantSlug))
	if tenantSlug == "" {
		if slug, exists := c.Get("tenantSlug"); exists {
			tenantSlug, _ = slug.(string)
		}
	}

	resp, err := h.service.LoginWithGoogle(c.Request.Context(), req.GoogleIDToken, tenantSlug)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (h *Handler) GoogleIdentity(c *gin.Context) {
	var req GoogleIdentityReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Token Google wajib diisi"})
		return
	}

	profile, err := h.service.ResolveGoogleIdentity(c.Request.Context(), req.GoogleIDToken)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, profile)
}

func (h *Handler) RequestOwnerPasswordReset(c *gin.Context) {
	var req OwnerPasswordResetRequestReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email owner wajib diisi"})
		return
	}
	if err := h.service.RequestOwnerPasswordReset(c.Request.Context(), req.Email); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Jika email owner terdaftar, link reset password sudah dikirim"})
}

func (h *Handler) VerifyOwnerPasswordReset(c *gin.Context) {
	var req OwnerPasswordResetVerifyReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Token dan password baru wajib diisi"})
		return
	}
	result, err := h.service.VerifyOwnerPasswordReset(c.Request.Context(), req.Token, req.NewPassword)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) VerifyOwnerEmail(c *gin.Context) {
	var req OwnerTokenVerifyReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Token verifikasi owner wajib diisi"})
		return
	}
	result, err := h.service.VerifyOwnerEmail(c.Request.Context(), req.Token)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, result)
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

func (h *Handler) GetAdminBootstrap(c *gin.Context) {
	tIDRaw, tenantExists := c.Get("tenantID")
	uIDRaw, userExists := c.Get("userID")
	if !tenantExists || !userExists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}

	tenantID, err := uuid.Parse(tIDRaw.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tenant tidak valid"})
		return
	}
	userID, err := uuid.Parse(uIDRaw.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID user tidak valid"})
		return
	}

	item, err := h.service.GetAdminBootstrap(c.Request.Context(), userID, tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memuat bootstrap admin"})
		return
	}
	if item == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi admin tidak valid, silakan login lagi"})
		return
	}

	sessionToken, err := h.service.RefreshAdminSessionTokenIfNeeded(
		c.Request.Context(),
		userID,
		tenantID,
		item.User.Role,
		c.GetString("entitlementVersion"),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyegarkan sesi admin"})
		return
	}
	if strings.TrimSpace(sessionToken) != "" {
		item.SessionToken = sessionToken
	}

	c.JSON(http.StatusOK, item)
}

func (h *Handler) GetOwnerAccount(c *gin.Context) {
	tIDRaw, tenantExists := c.Get("tenantID")
	uIDRaw, userExists := c.Get("userID")
	if !tenantExists || !userExists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi owner tidak valid"})
		return
	}

	tenantID, err := uuid.Parse(tIDRaw.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tenant tidak valid"})
		return
	}
	userID, err := uuid.Parse(uIDRaw.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID owner tidak valid"})
		return
	}

	item, err := h.service.GetOwnerAccountSettings(c.Request.Context(), userID, tenantID)
	if err != nil || item == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Profil akun owner tidak ditemukan"})
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *Handler) UpdateOwnerAccountIdentity(c *gin.Context) {
	tIDRaw, tenantExists := c.Get("tenantID")
	uIDRaw, userExists := c.Get("userID")
	if !tenantExists || !userExists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi owner tidak valid"})
		return
	}
	tenantID, _ := uuid.Parse(tIDRaw.(string))
	userID, _ := uuid.Parse(uIDRaw.(string))

	var req OwnerAccountIdentityUpdateReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nama dan email owner wajib diisi"})
		return
	}
	item, err := h.service.UpdateOwnerAccountIdentity(c.Request.Context(), userID, tenantID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Identitas owner berhasil diperbarui", "data": item})
}

func (h *Handler) SetupOwnerPassword(c *gin.Context) {
	tIDRaw, tenantExists := c.Get("tenantID")
	uIDRaw, userExists := c.Get("userID")
	if !tenantExists || !userExists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi owner tidak valid"})
		return
	}
	tenantID, _ := uuid.Parse(tIDRaw.(string))
	userID, _ := uuid.Parse(uIDRaw.(string))

	var req OwnerAccountPasswordSetupReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password baru minimal 6 karakter"})
		return
	}
	if err := h.service.SetupOwnerPassword(c.Request.Context(), userID, tenantID, req.NewPassword); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Password owner berhasil disimpan"})
}

func (h *Handler) ChangeOwnerPassword(c *gin.Context) {
	tIDRaw, tenantExists := c.Get("tenantID")
	uIDRaw, userExists := c.Get("userID")
	if !tenantExists || !userExists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi owner tidak valid"})
		return
	}
	tenantID, _ := uuid.Parse(tIDRaw.(string))
	userID, _ := uuid.Parse(uIDRaw.(string))

	var req OwnerAccountPasswordChangeReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password saat ini dan password baru wajib diisi"})
		return
	}
	if err := h.service.ChangeOwnerPassword(c.Request.Context(), userID, tenantID, req.CurrentPassword, req.NewPassword); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Password owner berhasil diperbarui"})
}

func (h *Handler) LinkOwnerGoogle(c *gin.Context) {
	tIDRaw, tenantExists := c.Get("tenantID")
	uIDRaw, userExists := c.Get("userID")
	if !tenantExists || !userExists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi owner tidak valid"})
		return
	}
	tenantID, _ := uuid.Parse(tIDRaw.(string))
	userID, _ := uuid.Parse(uIDRaw.(string))

	var req GoogleIdentityReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Token Google owner wajib diisi"})
		return
	}
	item, err := h.service.LinkOwnerGoogle(c.Request.Context(), userID, tenantID, req.GoogleIDToken)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Akun Google owner berhasil dihubungkan", "data": item})
}

func (h *Handler) RequestOwnerEmailVerification(c *gin.Context) {
	tIDRaw, tenantExists := c.Get("tenantID")
	uIDRaw, userExists := c.Get("userID")
	if !tenantExists || !userExists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi owner tidak valid"})
		return
	}
	tenantID, _ := uuid.Parse(tIDRaw.(string))
	userID, _ := uuid.Parse(uIDRaw.(string))

	var req OwnerEmailVerificationRequestReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email owner tidak valid"})
		return
	}
	var emailOverride *string
	if strings.TrimSpace(req.Email) != "" {
		email := req.Email
		emailOverride = &email
	}
	if err := h.service.RequestOwnerEmailVerification(c.Request.Context(), userID, tenantID, emailOverride); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Link verifikasi email owner sudah dikirim"})
}

func (h *Handler) DeleteOwnerAccount(c *gin.Context) {
	tIDRaw, tenantExists := c.Get("tenantID")
	uIDRaw, userExists := c.Get("userID")
	if !tenantExists || !userExists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi owner tidak valid"})
		return
	}
	tenantID, _ := uuid.Parse(tIDRaw.(string))
	userID, _ := uuid.Parse(uIDRaw.(string))

	var req OwnerDeleteAccountReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Konfirmasi hapus akun owner belum lengkap"})
		return
	}
	if err := h.service.DeleteOwnerAccount(c.Request.Context(), userID, tenantID, req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Akun owner berhasil dihapus"})
}

func (h *Handler) GetTenantIdentity(c *gin.Context) {
	tIDRaw, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}

	tID, err := uuid.Parse(tIDRaw.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tenant tidak valid"})
		return
	}

	item, err := h.service.GetTenantIdentity(c.Request.Context(), tID)
	if err != nil || item == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Profil identitas tenant tidak ditemukan"})
		return
	}

	c.JSON(http.StatusOK, item)
}

func (h *Handler) GetTenantDiscoveryProfile(c *gin.Context) {
	tIDRaw, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}

	tID, err := uuid.Parse(tIDRaw.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tenant tidak valid"})
		return
	}

	item, err := h.service.GetTenantDiscoveryProfile(c.Request.Context(), tID)
	if err != nil || item == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Profil discovery tenant tidak ditemukan"})
		return
	}

	c.JSON(http.StatusOK, item)
}

func (h *Handler) GetReferralPayoutSettings(c *gin.Context) {
	tIDRaw, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}

	tID, err := uuid.Parse(tIDRaw.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tenant tidak valid"})
		return
	}

	item, err := h.service.GetReferralPayoutSettings(c.Request.Context(), tID)
	if err != nil || item == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Pengaturan payout referral tidak ditemukan"})
		return
	}

	c.JSON(http.StatusOK, item)
}

func (h *Handler) GetTenantOnboardingSummary(c *gin.Context) {
	tIDRaw, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}

	tID, err := uuid.Parse(tIDRaw.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tenant tidak valid"})
		return
	}

	item, err := h.service.GetTenantOnboardingSummary(c.Request.Context(), tID)
	if err != nil || item == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ringkasan onboarding tenant tidak ditemukan"})
		return
	}

	c.JSON(http.StatusOK, item)
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

func (h *Handler) GetPaymentMethods(c *gin.Context) {
	tIDRaw, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}
	tID, _ := uuid.Parse(tIDRaw.(string))
	items, err := h.service.GetPaymentMethods(c.Request.Context(), tID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil metode pembayaran"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *Handler) GetDepositSettings(c *gin.Context) {
	tIDRaw, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}
	tID, _ := uuid.Parse(tIDRaw.(string))
	item, err := h.service.GetDepositSettings(c.Request.Context(), tID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil pengaturan DP"})
		return
	}
	c.JSON(http.StatusOK, item)
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

func (h *Handler) GetPageBuilder(c *gin.Context) {
	tIDRaw, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}

	tID, _ := uuid.Parse(tIDRaw.(string))
	state, err := h.service.GetPageBuilder(c.Request.Context(), tID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Gagal mengambil page builder"})
		return
	}
	c.JSON(http.StatusOK, state)
}

func (h *Handler) UpdatePageBuilder(c *gin.Context) {
	tIDRaw, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}
	actorRaw := c.GetString("userID")
	tID, _ := uuid.Parse(tIDRaw.(string))
	actorID, _ := uuid.Parse(actorRaw)

	var req PageBuilderUpdateReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format data builder tidak valid"})
		return
	}

	state, err := h.service.UpdatePageBuilder(c.Request.Context(), actorID, tID, req.Page, req.Theme, req.BookingForm)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Page builder diperbarui", "data": state})
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

func (h *Handler) UpdatePaymentMethods(c *gin.Context) {
	tIDRaw, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}
	actorRaw := c.GetString("userID")

	tID, _ := uuid.Parse(tIDRaw.(string))
	actorID, _ := uuid.Parse(actorRaw)
	var req TenantPaymentMethodUpdateReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format data metode pembayaran tidak valid"})
		return
	}

	items, err := h.service.UpdatePaymentMethods(c.Request.Context(), actorID, tID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Metode pembayaran diperbarui", "items": items})
}

func (h *Handler) UpdateDepositSettings(c *gin.Context) {
	tIDRaw, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}
	tID, _ := uuid.Parse(tIDRaw.(string))
	var req TenantDepositSettingUpdateReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format data DP tidak valid"})
		return
	}
	item, err := h.service.UpdateDepositSettings(c.Request.Context(), tID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Pengaturan DP diperbarui", "data": item})
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
