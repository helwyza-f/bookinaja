package promo

import (
	"net/http"
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

func (h *Handler) List(c *gin.Context) {
	tenantID, ok := tenantUUIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "sesi tenant tidak valid"})
		return
	}
	items, err := h.service.List(c.Request.Context(), tenantID, ListFilter{
		Search: c.Query("search"),
		Status: c.Query("status"),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal mengambil promo"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *Handler) GetByID(c *gin.Context) {
	tenantID, ok := tenantUUIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "sesi tenant tidak valid"})
		return
	}
	promoID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id promo tidak valid"})
		return
	}
	item, err := h.service.GetByID(c.Request.Context(), tenantID, promoID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "promo tidak ditemukan"})
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *Handler) ListRedemptions(c *gin.Context) {
	tenantID, ok := tenantUUIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "sesi tenant tidak valid"})
		return
	}
	promoID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id promo tidak valid"})
		return
	}
	items, err := h.service.ListRedemptions(c.Request.Context(), tenantID, promoID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal mengambil histori promo"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *Handler) Create(c *gin.Context) {
	h.upsert(c, nil)
}

func (h *Handler) Update(c *gin.Context) {
	promoID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id promo tidak valid"})
		return
	}
	h.upsert(c, &promoID)
}

func (h *Handler) UpdateStatus(c *gin.Context) {
	tenantID, ok := tenantUUIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "sesi tenant tidak valid"})
		return
	}
	promoID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id promo tidak valid"})
		return
	}
	var req struct {
		IsActive bool `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "payload status tidak valid"})
		return
	}
	actorID := userUUIDFromContext(c)
	if err := h.service.UpdateStatus(c.Request.Context(), tenantID, promoID, req.IsActive, actorID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal memperbarui status promo"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "status promo diperbarui"})
}

func (h *Handler) Preview(c *gin.Context) {
	var req PreviewReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "payload preview promo tidak valid"})
		return
	}
	if req.TenantID == uuid.Nil {
		if tenantID, ok := tenantUUIDFromContext(c); ok {
			req.TenantID = tenantID
		}
	}
	if req.TenantID == uuid.Nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenant promo tidak valid"})
		return
	}
	res, err := h.service.Preview(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal memvalidasi promo"})
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *Handler) upsert(c *gin.Context, promoID *uuid.UUID) {
	tenantID, ok := tenantUUIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "sesi tenant tidak valid"})
		return
	}
	var req UpsertPromoReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "data promo tidak valid"})
		return
	}
	item, err := h.service.Upsert(c.Request.Context(), tenantID, promoID, userUUIDFromContext(c), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	status := http.StatusCreated
	if promoID != nil {
		status = http.StatusOK
	}
	c.JSON(status, item)
}

func tenantUUIDFromContext(c *gin.Context) (uuid.UUID, bool) {
	raw, exists := c.Get("tenantID")
	if !exists {
		return uuid.Nil, false
	}
	switch value := raw.(type) {
	case uuid.UUID:
		return value, true
	case string:
		id, err := uuid.Parse(strings.TrimSpace(value))
		if err != nil {
			return uuid.Nil, false
		}
		return id, true
	default:
		return uuid.Nil, false
	}
}

func userUUIDFromContext(c *gin.Context) *uuid.UUID {
	raw, exists := c.Get("userID")
	if !exists {
		return nil
	}
	switch value := raw.(type) {
	case uuid.UUID:
		return &value
	case string:
		id, err := uuid.Parse(strings.TrimSpace(value))
		if err != nil {
			return nil
		}
		return &id
	default:
		return nil
	}
}
