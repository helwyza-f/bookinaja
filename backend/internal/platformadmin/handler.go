package platformadmin

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/helwiza/backend/internal/platform/security"
	"github.com/lib/pq"
)

type Handler struct {
	svc  *Service
	repo *Repository
}

func NewHandler(svc *Service, repo *Repository) *Handler {
	return &Handler{svc: svc, repo: repo}
}

func (h *Handler) Login(c *gin.Context) {
	var req struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "email dan password wajib diisi"})
		return
	}
	if err := h.svc.Authenticate(req.Email, req.Password); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "email atau password salah"})
		return
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id":   "platform-admin",
		"tenant_id": "",
		"role":      "platform_admin",
		"exp":       time.Now().Add(time.Hour * 168).Unix(),
	})
	tokenString, err := token.SignedString([]byte(security.JWTSecret()))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal membuat token"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"token": tokenString, "user": gin.H{"email": req.Email, "role": "platform_admin"}})
}

func (h *Handler) Me(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "authenticated", "role": c.GetString("userRole")})
}

func (h *Handler) Summary(c *gin.Context) {
	data, err := h.repo.Summary(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	respondData(c, data)
}

func (h *Handler) DiscoveryAnalytics(c *gin.Context) {
	data, err := h.repo.GetDiscoveryAnalytics(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	respondData(c, data)
}

func (h *Handler) GetDiscoveryFeedSetting(c *gin.Context) {
	data, err := h.repo.GetDiscoveryFeedSetting(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	respondData(c, data)
}

func (h *Handler) UpdateDiscoveryFeedSetting(c *gin.Context) {
	var req struct {
		EnableDiscoveryPosts bool `json:"enable_discovery_posts"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "payload pengaturan discovery feed tidak valid"})
		return
	}
	if err := h.repo.UpdateDiscoveryFeedSetting(c.Request.Context(), req.EnableDiscoveryPosts); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	data, err := h.repo.GetDiscoveryFeedSetting(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message": "pengaturan discovery feed diperbarui",
		"data":    data,
	})
}

func (h *Handler) Tenants(c *gin.Context) {
	data, err := h.repo.ListTenants(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	respondData(c, data)
}

func (h *Handler) UpdateTenantDiscoveryEditorial(c *gin.Context) {
	tenantID := strings.TrimSpace(c.Param("tenant_id"))
	if tenantID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenant_id wajib diisi"})
		return
	}

	var req struct {
		DiscoveryHeadline    string     `json:"discovery_headline"`
		DiscoverySubheadline string     `json:"discovery_subheadline"`
		PromoLabel           string     `json:"promo_label"`
		FeaturedImageURL     string     `json:"featured_image_url"`
		HighlightCopy        string     `json:"highlight_copy"`
		DiscoveryTags        []string   `json:"discovery_tags"`
		DiscoveryBadges      []string   `json:"discovery_badges"`
		DiscoveryFeatured    bool       `json:"discovery_featured"`
		DiscoveryPromoted    bool       `json:"discovery_promoted"`
		DiscoveryPriority    int        `json:"discovery_priority"`
		PromoStartsAt        *time.Time `json:"promo_starts_at"`
		PromoEndsAt          *time.Time `json:"promo_ends_at"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "payload editorial tidak valid"})
		return
	}
	if req.DiscoveryPriority < 0 {
		req.DiscoveryPriority = 0
	}

	payload := map[string]any{
		"tenant_id":             tenantID,
		"discovery_headline":    strings.TrimSpace(req.DiscoveryHeadline),
		"discovery_subheadline": strings.TrimSpace(req.DiscoverySubheadline),
		"promo_label":           strings.TrimSpace(req.PromoLabel),
		"featured_image_url":    strings.TrimSpace(req.FeaturedImageURL),
		"highlight_copy":        strings.TrimSpace(req.HighlightCopy),
		"discovery_tags":        pq.StringArray(cleanStringSlice(req.DiscoveryTags)),
		"discovery_badges":      pq.StringArray(cleanStringSlice(req.DiscoveryBadges)),
		"discovery_featured":    req.DiscoveryFeatured,
		"discovery_promoted":    req.DiscoveryPromoted,
		"discovery_priority":    req.DiscoveryPriority,
		"promo_starts_at":       req.PromoStartsAt,
		"promo_ends_at":         req.PromoEndsAt,
	}

	if err := h.repo.UpdateTenantDiscoveryEditorial(c.Request.Context(), tenantID, payload); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "editorial discovery tenant diperbarui"})
}

func cleanStringSlice(values []string) []string {
	out := make([]string, 0, len(values))
	seen := map[string]struct{}{}
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		key := strings.ToLower(trimmed)
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, trimmed)
	}
	return out
}

func (h *Handler) Customers(c *gin.Context) {
	data, err := h.repo.ListCustomers(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	respondData(c, data)
}

func (h *Handler) TenantDetail(c *gin.Context) {
	tenantID := strings.TrimSpace(c.Param("tenant_id"))
	if tenantID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenant_id wajib diisi"})
		return
	}
	detail, err := h.repo.GetTenantDetail(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	insights, err := h.repo.GetTenantInsights(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	balance, err := h.repo.GetTenantBalance(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	respondData(c, gin.H{
		"tenant": detail,
		"summary": gin.H{
			"subscription_summary": gin.H{
				"revenue":              insights["subscription_revenue"],
				"transactions":         insights["subscription_transactions"],
				"status":               detail["status"],
				"current_period_start": detail["subscription_current_period_start"],
				"current_period_end":   detail["subscription_current_period_end"],
			},
			"booking_summary": gin.H{
				"balance":       balance["balance"],
				"transactions":  insights["booking_transactions"],
				"customers":     insights["customers_count"],
				"bookings":      insights["bookings_count"],
				"midtrans_logs": insights["midtrans_logs"],
			},
		},
	})
}

func (h *Handler) TenantCustomers(c *gin.Context) {
	tenantID := strings.TrimSpace(c.Param("tenant_id"))
	if tenantID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenant_id wajib diisi"})
		return
	}
	data, err := h.repo.ListCustomersByTenant(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	respondData(c, data)
}

func (h *Handler) TenantTransactions(c *gin.Context) {
	tenantID := strings.TrimSpace(c.Param("tenant_id"))
	if tenantID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenant_id wajib diisi"})
		return
	}
	page, pageSize := parsePageParams(c)
	data, total, err := h.repo.ListTransactionsByTenant(c.Request.Context(), tenantID, page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	respondPage(c, data, page, pageSize, total)
}

func (h *Handler) Transactions(c *gin.Context) {
	page, pageSize := parsePageParams(c)
	data, total, err := h.repo.ListTransactions(c.Request.Context(), page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	respondPage(c, data, page, pageSize, total)
}

func (h *Handler) TenantBalances(c *gin.Context) {
	data, err := h.repo.ListTenantBalances(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	respondData(c, data)
}

func (h *Handler) TenantBalanceDetail(c *gin.Context) {
	tenantID := strings.TrimSpace(c.Param("tenant_id"))
	if tenantID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenant_id wajib diisi"})
		return
	}
	data, err := h.repo.GetTenantBalance(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	respondData(c, data)
}

func (h *Handler) MidtransNotifications(c *gin.Context) {
	tenantSlug := strings.TrimSpace(c.Query("tenant"))
	page, pageSize := parsePageParams(c)
	data, total, err := h.repo.ListMidtransNotificationLogs(c.Request.Context(), page, pageSize, tenantSlug)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	respondPage(c, data, page, pageSize, total)
}

func (h *Handler) TenantMidtransNotifications(c *gin.Context) {
	tenantID := strings.TrimSpace(c.Param("tenant_id"))
	if tenantID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenant_id wajib diisi"})
		return
	}
	page, pageSize := parsePageParams(c)
	data, total, err := h.repo.ListMidtransNotificationLogsByTenantID(c.Request.Context(), tenantID, page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	respondPage(c, data, page, pageSize, total)
}

func (h *Handler) Revenue(c *gin.Context) {
	tenantSlug := strings.TrimSpace(c.Query("tenant"))
	start, _ := parseTimePtr(c.Query("from"))
	end, _ := parseTimePtr(c.Query("to"))

	data, err := h.repo.RevenueReport(c.Request.Context(), tenantSlug, start, end)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	respondData(c, data)
}

func (h *Handler) RevenueBreakdown(c *gin.Context) {
	start, _ := parseTimePtr(c.Query("from"))
	end, _ := parseTimePtr(c.Query("to"))

	data, err := h.repo.RevenueByTenant(c.Request.Context(), start, end)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	respondData(c, data)
}

func (h *Handler) RevenueTimeseries(c *gin.Context) {
	tenantSlug := strings.TrimSpace(c.Query("tenant"))
	interval := strings.TrimSpace(c.Query("interval"))
	start, _ := parseTimePtr(c.Query("from"))
	end, _ := parseTimePtr(c.Query("to"))

	data, err := h.repo.RevenueTimeseries(c.Request.Context(), tenantSlug, interval, start, end)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	respondData(c, data)
}

func (h *Handler) RevenueCSV(c *gin.Context) {
	tenantSlug := strings.TrimSpace(c.Query("tenant"))
	start, _ := parseTimePtr(c.Query("from"))
	end, _ := parseTimePtr(c.Query("to"))

	csvData, err := h.repo.RevenueCSV(c.Request.Context(), tenantSlug, start, end)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	filename := "revenue-report.csv"
	if tenantSlug != "" {
		filename = "revenue-" + sanitizeFilename(tenantSlug) + ".csv"
	}
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", `attachment; filename="`+filename+`"`)
	_, _ = c.Writer.WriteString(csvData)
}

func (h *Handler) ReferralWithdrawals(c *gin.Context) {
	status := strings.TrimSpace(c.Query("status"))
	data, err := h.repo.ListReferralWithdrawals(c.Request.Context(), status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	respondData(c, data)
}

func (h *Handler) UpdateReferralWithdrawalStatus(c *gin.Context) {
	withdrawalID := strings.TrimSpace(c.Param("id"))
	if withdrawalID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "withdrawal id wajib diisi"})
		return
	}
	var req struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "status wajib diisi"})
		return
	}
	if err := h.repo.UpdateReferralWithdrawalStatus(c.Request.Context(), withdrawalID, req.Status); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "status pencairan diperbarui"})
}

func parseTimePtr(raw string) (*time.Time, error) {
	if strings.TrimSpace(raw) == "" {
		return nil, nil
	}
	parsed, err := time.Parse("2006-01-02", raw)
	if err != nil {
		return nil, err
	}
	return &parsed, nil
}

func parsePageParams(c *gin.Context) (int, int) {
	page := 1
	pageSize := 25
	if raw := strings.TrimSpace(c.Query("page")); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 {
			page = parsed
		}
	}
	if raw := strings.TrimSpace(c.Query("page_size")); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 {
			pageSize = parsed
		}
	}
	return page, pageSize
}

func respondData(c *gin.Context, data any) {
	c.JSON(http.StatusOK, gin.H{"data": data})
}

func respondPage(c *gin.Context, items any, page, pageSize, total int) {
	c.JSON(http.StatusOK, gin.H{
		"data": items,
		"meta": gin.H{
			"page":      page,
			"page_size": pageSize,
			"total":     total,
		},
	})
}

func sanitizeFilename(value string) string {
	safe := strings.TrimSpace(strings.ToLower(value))
	safe = strings.ReplaceAll(safe, " ", "-")
	safe = strings.Map(func(r rune) rune {
		switch {
		case r >= 'a' && r <= 'z':
			return r
		case r >= '0' && r <= '9':
			return r
		case r == '-', r == '_':
			return r
		default:
			return '-'
		}
	}, safe)
	safe = strings.Trim(safe, "-_")
	if safe == "" {
		return "report"
	}
	return safe
}
