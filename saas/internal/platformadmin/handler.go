package platformadmin

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/helwiza/saas/internal/platform/security"
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
	c.JSON(http.StatusOK, data)
}

func (h *Handler) Tenants(c *gin.Context) {
	data, err := h.repo.ListTenants(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
}

func (h *Handler) Customers(c *gin.Context) {
	data, err := h.repo.ListCustomers(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
}

func (h *Handler) TenantDetail(c *gin.Context) {
	tenantID := strings.TrimSpace(c.Param("tenant_id"))
	if tenantID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenant_id wajib diisi"})
		return
	}
	data, err := h.repo.GetTenantDetail(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
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
	c.JSON(http.StatusOK, data)
}

func (h *Handler) TenantTransactions(c *gin.Context) {
	tenantID := strings.TrimSpace(c.Param("tenant_id"))
	if tenantID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenant_id wajib diisi"})
		return
	}
	data, err := h.repo.ListTransactionsByTenant(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
}

func (h *Handler) Transactions(c *gin.Context) {
	data, err := h.repo.ListTransactions(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
}

func (h *Handler) TenantBalances(c *gin.Context) {
	data, err := h.repo.ListTenantBalances(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
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
	c.JSON(http.StatusOK, data)
}

func (h *Handler) MidtransNotifications(c *gin.Context) {
	tenantSlug := strings.TrimSpace(c.Query("tenant"))
	limit := 100
	if raw := strings.TrimSpace(c.Query("limit")); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil {
			limit = parsed
		}
	}
	data, err := h.repo.ListMidtransNotificationLogs(c.Request.Context(), limit, tenantSlug)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
}

func (h *Handler) TenantMidtransNotifications(c *gin.Context) {
	tenantID := strings.TrimSpace(c.Param("tenant_id"))
	if tenantID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenant_id wajib diisi"})
		return
	}
	limit := 100
	if raw := strings.TrimSpace(c.Query("limit")); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil {
			limit = parsed
		}
	}
	data, err := h.repo.ListMidtransNotificationLogsByTenantID(c.Request.Context(), tenantID, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
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
	c.JSON(http.StatusOK, data)
}

func (h *Handler) RevenueBreakdown(c *gin.Context) {
	start, _ := parseTimePtr(c.Query("from"))
	end, _ := parseTimePtr(c.Query("to"))

	data, err := h.repo.RevenueByTenant(c.Request.Context(), start, end)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, data)
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
	c.JSON(http.StatusOK, data)
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
