package sales

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func tenantIDFromContext(c *gin.Context) (uuid.UUID, bool) {
	raw, ok := c.Get("tenantID")
	if !ok {
		return uuid.Nil, false
	}
	tenantID, err := uuid.Parse(strings.TrimSpace(raw.(string)))
	if err != nil {
		return uuid.Nil, false
	}
	return tenantID, true
}

func userIDFromContext(c *gin.Context) *uuid.UUID {
	raw, ok := c.Get("userID")
	if !ok || raw == nil {
		return nil
	}
	parsed, err := uuid.Parse(strings.TrimSpace(raw.(string)))
	if err != nil {
		return nil
	}
	return &parsed
}

func (h *Handler) Create(c *gin.Context) {
	tenantID, ok := tenantIDFromContext(c)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenantID invalid"})
		return
	}

	var req CreateOrderInput
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "payload invalid"})
		return
	}

	order, err := h.service.CreateOrder(c.Request.Context(), tenantID, userIDFromContext(c), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, order)
}

func (h *Handler) GetByID(c *gin.Context) {
	tenantID, ok := tenantIDFromContext(c)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenantID invalid"})
		return
	}
	orderID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "sales order id invalid"})
		return
	}
	order, err := h.service.GetByID(c.Request.Context(), tenantID, orderID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "sales order not found"})
		return
	}
	c.JSON(http.StatusOK, order)
}

func (h *Handler) List(c *gin.Context) {
	tenantID, ok := tenantIDFromContext(c)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenantID invalid"})
		return
	}
	limit := 20
	if v := c.Query("limit"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil {
			limit = parsed
		}
	}
	items, err := h.service.ListByTenant(c.Request.Context(), tenantID, limit, c.Query("status"), c.Query("search"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *Handler) ListOpen(c *gin.Context) {
	tenantID, ok := tenantIDFromContext(c)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenantID invalid"})
		return
	}
	limit := 20
	if v := c.Query("limit"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil {
			limit = parsed
		}
	}
	items, err := h.service.ListOpenByTenant(c.Request.Context(), tenantID, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *Handler) ActionFeed(c *gin.Context) {
	tenantID, ok := tenantIDFromContext(c)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenantID invalid"})
		return
	}
	limit := 40
	if v := c.Query("limit"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil {
			limit = parsed
		}
	}
	windowMinutes := 240
	if v := c.Query("window_minutes"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil {
			windowMinutes = parsed
		}
	}
	items, err := h.service.ListPOSActionFeed(c.Request.Context(), tenantID, limit, windowMinutes, c.Query("search"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *Handler) AddItem(c *gin.Context) {
	tenantID, ok := tenantIDFromContext(c)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenantID invalid"})
		return
	}
	orderID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "sales order id invalid"})
		return
	}
	var req AddItemInput
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "payload invalid"})
		return
	}
	item, err := h.service.AddItem(c.Request.Context(), tenantID, orderID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, item)
}

func (h *Handler) UpdateItem(c *gin.Context) {
	tenantID, ok := tenantIDFromContext(c)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenantID invalid"})
		return
	}
	orderID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "sales order id invalid"})
		return
	}
	itemID, err := uuid.Parse(c.Param("item_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "sales order item id invalid"})
		return
	}
	var req UpdateItemInput
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "payload invalid"})
		return
	}
	if err := h.service.UpdateItem(c.Request.Context(), tenantID, orderID, itemID, req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "sales order item updated"})
}

func (h *Handler) DeleteItem(c *gin.Context) {
	tenantID, ok := tenantIDFromContext(c)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenantID invalid"})
		return
	}
	orderID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "sales order id invalid"})
		return
	}
	itemID, err := uuid.Parse(c.Param("item_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "sales order item id invalid"})
		return
	}
	if err := h.service.DeleteItem(c.Request.Context(), tenantID, orderID, itemID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "sales order item deleted"})
}

func (h *Handler) Checkout(c *gin.Context) {
	tenantID, ok := tenantIDFromContext(c)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenantID invalid"})
		return
	}
	orderID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "sales order id invalid"})
		return
	}
	var req CheckoutInput
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "payload invalid"})
		return
	}
	if err := h.service.Checkout(c.Request.Context(), tenantID, orderID, req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "sales order checked out"})
}

func (h *Handler) SettleCash(c *gin.Context) {
	tenantID, ok := tenantIDFromContext(c)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenantID invalid"})
		return
	}
	orderID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "sales order id invalid"})
		return
	}
	var req CashSettleInput
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "payload invalid"})
		return
	}
	if err := h.service.SettleCash(c.Request.Context(), tenantID, orderID, req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "sales order settled"})
}

func (h *Handler) CheckoutPayment(c *gin.Context) {
	tenantID, ok := tenantIDFromContext(c)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenantID invalid"})
		return
	}
	orderID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "sales order id invalid"})
		return
	}
	var req PaymentCheckoutInput
	_ = c.ShouldBindJSON(&req)
	res, err := h.service.CheckoutPayment(c.Request.Context(), tenantID, orderID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *Handler) SubmitManualPayment(c *gin.Context) {
	tenantID, ok := tenantIDFromContext(c)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenantID invalid"})
		return
	}
	orderID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "sales order id invalid"})
		return
	}
	var req ManualPaymentInput
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "payload invalid"})
		return
	}
	res, err := h.service.SubmitManualPayment(c.Request.Context(), tenantID, orderID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *Handler) VerifyManualPayment(c *gin.Context) {
	tenantID, ok := tenantIDFromContext(c)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenantID invalid"})
		return
	}
	attemptID, err := uuid.Parse(c.Param("attempt_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "attempt id invalid"})
		return
	}
	var req PaymentVerificationInput
	_ = c.ShouldBindJSON(&req)
	if err := h.service.VerifyManualPayment(c.Request.Context(), tenantID, attemptID, true, req.Notes); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Pembayaran manual diverifikasi"})
}

func (h *Handler) RejectManualPayment(c *gin.Context) {
	tenantID, ok := tenantIDFromContext(c)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenantID invalid"})
		return
	}
	attemptID, err := uuid.Parse(c.Param("attempt_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "attempt id invalid"})
		return
	}
	var req PaymentVerificationInput
	_ = c.ShouldBindJSON(&req)
	if err := h.service.VerifyManualPayment(c.Request.Context(), tenantID, attemptID, false, req.Notes); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Pembayaran manual ditolak"})
}

func (h *Handler) Close(c *gin.Context) {
	tenantID, ok := tenantIDFromContext(c)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenantID invalid"})
		return
	}
	orderID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "sales order id invalid"})
		return
	}
	if err := h.service.Close(c.Request.Context(), tenantID, orderID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "sales order closed"})
}
