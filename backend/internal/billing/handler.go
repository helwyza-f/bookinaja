package billing

import (
	"net/http"
	"strconv"

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

// GET /api/v1/billing/orders?limit=20 (auth required)
func (h *Handler) ListOrders(c *gin.Context) {
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

	limit := 20
	if v := c.Query("limit"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil {
			limit = parsed
		}
	}

	orders, err := h.svc.ListOrders(c.Request.Context(), tenantID, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"orders": orders})
}

// POST /api/v1/billing/bookings/checkout
func (h *Handler) BookingCheckout(c *gin.Context) {
	tenantSlugVal, _ := c.Get("tenantSlug")
	tenantSlug, _ := tenantSlugVal.(string)
	if tenantSlug == "" {
		tenantSlug = "tenant"
	}

	bookingID := c.Param("id")
	if bookingID == "" {
		var req BookingCheckoutReq
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "payload invalid"})
			return
		}
		bookingID = req.BookingID
	}

	bID, err := uuid.Parse(bookingID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bookingID invalid"})
		return
	}

	var tenantID uuid.UUID
	if tenantIDVal, ok := c.Get("tenantID"); ok {
		tenantIDStr, ok := tenantIDVal.(string)
		if !ok || tenantIDStr == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "tenantID invalid"})
			return
		}
		tenantID, err = uuid.Parse(tenantIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "tenantID invalid"})
			return
		}
	} else {
		tenantID, err = h.svc.ResolveBookingTenantID(c.Request.Context(), bID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "tenantID missing"})
			return
		}
	}

	mode := c.Query("mode")
	if mode == "" {
		mode = c.Query("type")
	}
	method := c.Query("method")
	if method == "" {
		var req BookingCheckoutReq
		_ = c.ShouldBindJSON(&req)
		if req.Method != "" {
			method = req.Method
		}
	}
	res, err := h.svc.CheckoutBookingPayment(c.Request.Context(), tenantID, tenantSlug, bID, mode, method)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *Handler) ListTenantPaymentMethods(c *gin.Context) {
	tenantIDVal, ok := c.Get("tenantID")
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenantID missing"})
		return
	}
	tenantID, err := uuid.Parse(tenantIDVal.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenantID invalid"})
		return
	}
	items, err := h.svc.ListTenantPaymentMethods(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *Handler) SubmitManualBookingPayment(c *gin.Context) {
	var req BookingPaymentManualSubmitReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "payload invalid"})
		return
	}

	if req.BookingID == "" {
		req.BookingID = c.Param("id")
	}
	bookingID, err := uuid.Parse(req.BookingID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bookingID invalid"})
		return
	}

	var tenantID uuid.UUID
	if tenantIDVal, ok := c.Get("tenantID"); ok {
		tenantID, err = uuid.Parse(tenantIDVal.(string))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "tenantID invalid"})
			return
		}
	} else {
		tenantID, err = h.svc.ResolveBookingTenantID(c.Request.Context(), bookingID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "tenantID missing"})
			return
		}
	}

	var customerID *uuid.UUID
	if raw, exists := c.Get("customerID"); exists {
		if parsed, err := uuid.Parse(raw.(string)); err == nil {
			customerID = &parsed
		}
	}

	res, err := h.svc.SubmitManualBookingPayment(c.Request.Context(), tenantID, bookingID, customerID, req.Scope, req.Method, req.Note, req.ProofURL)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *Handler) VerifyManualBookingPayment(c *gin.Context) {
	tenantIDVal, ok := c.Get("tenantID")
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenantID missing"})
		return
	}
	tenantID, err := uuid.Parse(tenantIDVal.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenantID invalid"})
		return
	}
	attemptID, err := uuid.Parse(c.Param("attempt_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "attemptID invalid"})
		return
	}
	var req BookingPaymentVerificationReq
	_ = c.ShouldBindJSON(&req)
	if err := h.svc.VerifyManualBookingPayment(c.Request.Context(), tenantID, attemptID, true, req.Notes); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Pembayaran manual diverifikasi"})
}

func (h *Handler) RejectManualBookingPayment(c *gin.Context) {
	tenantIDVal, ok := c.Get("tenantID")
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenantID missing"})
		return
	}
	tenantID, err := uuid.Parse(tenantIDVal.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenantID invalid"})
		return
	}
	attemptID, err := uuid.Parse(c.Param("attempt_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "attemptID invalid"})
		return
	}
	var req BookingPaymentVerificationReq
	_ = c.ShouldBindJSON(&req)
	if err := h.svc.VerifyManualBookingPayment(c.Request.Context(), tenantID, attemptID, false, req.Notes); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Pembayaran manual ditolak"})
}

func (h *Handler) ListBookingPaymentAttempts(c *gin.Context) {
	tenantIDVal, ok := c.Get("tenantID")
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenantID missing"})
		return
	}
	tenantID, err := uuid.Parse(tenantIDVal.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenantID invalid"})
		return
	}
	bookingID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bookingID invalid"})
		return
	}
	items, err := h.svc.ListBookingPaymentAttempts(c.Request.Context(), tenantID, bookingID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}
