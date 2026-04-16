package billing

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// POST /api/v1/billing/checkout (auth required)
func (h *Handler) Checkout(c *gin.Context) {
	tenantIDVal, ok := c.Get("tenantID")
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenantID missing"})
		return
	}
	tenantIDStr, ok := tenantIDVal.(string)
	if !ok || tenantIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenantID invalid"})
		return
	}

	tenantSlugVal, _ := c.Get("tenantSlug")
	tenantSlug, _ := tenantSlugVal.(string)
	if tenantSlug == "" {
		tenantSlug = "tenant"
	}

	tenantID, err := uuid.Parse(tenantIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenantID invalid"})
		return
	}

	var req CheckoutReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "payload invalid"})
		return
	}

	res, err := h.svc.Checkout(c.Request.Context(), tenantID, tenantSlug, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, res)
}

// GET /api/v1/billing/subscription (auth required)
func (h *Handler) GetSubscription(c *gin.Context) {
	tenantIDVal, ok := c.Get("tenantID")
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenantID missing"})
		return
	}
	tenantIDStr, ok := tenantIDVal.(string)
	if !ok || tenantIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenantID invalid"})
		return
	}

	tenantID, err := uuid.Parse(tenantIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenantID invalid"})
		return
	}

	info, err := h.svc.GetSubscription(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, info)
}

// POST /api/webhooks/midtrans (no auth; signature verified)
func (h *Handler) MidtransWebhook(c *gin.Context) {
	var payload map[string]any
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "payload invalid"})
		return
	}

	if err := h.svc.HandleMidtransNotification(c.Request.Context(), payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"ok": true})
}
