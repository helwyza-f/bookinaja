package expense

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Handler struct {
	service *Service
}

func NewHandler(s *Service) *Handler {
	return &Handler{service: s}
}

type expensePayload struct {
	Title         string `json:"title" binding:"required"`
	Category      string `json:"category"`
	Amount        int64  `json:"amount" binding:"required"`
	ExpenseDate   string `json:"expense_date" binding:"required"`
	PaymentMethod string `json:"payment_method"`
	Vendor        string `json:"vendor"`
	Notes         string `json:"notes"`
	ReceiptURL    string `json:"receipt_url"`
}

func parseExpenseDate(raw string) (time.Time, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return time.Time{}, errors.New("expense_date is required")
	}

	if parsed, err := time.Parse(time.RFC3339, raw); err == nil {
		return parsed, nil
	}

	if parsed, err := time.Parse("2006-01-02", raw); err == nil {
		return parsed, nil
	}

	if parsed, err := time.ParseInLocation("2006-01-02", raw, time.Local); err == nil {
		return parsed, nil
	}

	return time.Time{}, errors.New("expense_date invalid")
}

func tenantIDFromContext(c *gin.Context) (uuid.UUID, bool) {
	tenantIDVal, ok := c.Get("tenantID")
	if !ok {
		return uuid.Nil, false
	}
	tenantIDStr, ok := tenantIDVal.(string)
	if !ok || strings.TrimSpace(tenantIDStr) == "" {
		return uuid.Nil, false
	}
	tenantID, err := uuid.Parse(tenantIDStr)
	if err != nil {
		return uuid.Nil, false
	}
	return tenantID, true
}

// GET /api/v1/expenses
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

	items, err := h.service.List(
		c.Request.Context(),
		tenantID,
		limit,
		c.Query("search"),
		c.Query("category"),
		c.Query("from"),
		c.Query("to"),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, items)
}

// GET /api/v1/expenses/summary
func (h *Handler) Summary(c *gin.Context) {
	tenantID, ok := tenantIDFromContext(c)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenantID invalid"})
		return
	}

	summary, err := h.service.Summary(
		c.Request.Context(),
		tenantID,
		c.Query("from"),
		c.Query("to"),
		c.Query("category"),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, summary)
}

// GET /api/v1/expenses/:id
func (h *Handler) GetByID(c *gin.Context) {
	tenantID, ok := tenantIDFromContext(c)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenantID invalid"})
		return
	}

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "expense id invalid"})
		return
	}

	item, err := h.service.GetByID(c.Request.Context(), tenantID, id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "expense not found"})
		return
	}
	c.JSON(http.StatusOK, item)
}

// POST /api/v1/expenses
func (h *Handler) Create(c *gin.Context) {
	tenantID, ok := tenantIDFromContext(c)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenantID invalid"})
		return
	}

	var req expensePayload
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "payload invalid"})
		return
	}

	expenseDate, err := parseExpenseDate(req.ExpenseDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "expense_date invalid"})
		return
	}

	item, err := h.service.Create(c.Request.Context(), tenantID, CreateExpenseInput{
		Title:         req.Title,
		Category:      req.Category,
		Amount:        req.Amount,
		ExpenseDate:   expenseDate,
		PaymentMethod: req.PaymentMethod,
		Vendor:        req.Vendor,
		Notes:         req.Notes,
		ReceiptURL:    req.ReceiptURL,
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, item)
}

// PUT /api/v1/expenses/:id
func (h *Handler) Update(c *gin.Context) {
	tenantID, ok := tenantIDFromContext(c)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenantID invalid"})
		return
	}

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "expense id invalid"})
		return
	}

	var req expensePayload
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "payload invalid"})
		return
	}

	expenseDate, err := parseExpenseDate(req.ExpenseDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "expense_date invalid"})
		return
	}

	if err := h.service.Update(c.Request.Context(), tenantID, id, UpdateExpenseInput{
		Title:         req.Title,
		Category:      req.Category,
		Amount:        req.Amount,
		ExpenseDate:   expenseDate,
		PaymentMethod: req.PaymentMethod,
		Vendor:        req.Vendor,
		Notes:         req.Notes,
		ReceiptURL:    req.ReceiptURL,
	}); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "expense updated"})
}

// DELETE /api/v1/expenses/:id
func (h *Handler) Delete(c *gin.Context) {
	tenantID, ok := tenantIDFromContext(c)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenantID invalid"})
		return
	}

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "expense id invalid"})
		return
	}

	if err := h.service.Delete(c.Request.Context(), tenantID, id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "expense deleted"})
}
