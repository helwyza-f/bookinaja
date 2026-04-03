package fnb

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Handler struct {
	service *Service
}

func NewHandler(s *Service) *Handler {
	return &Handler{service: s}
}

func (h *Handler) GetMenu(c *gin.Context) {
	tIDRaw, _ := c.Get("tenantID")
	tID, _ := uuid.Parse(tIDRaw.(string))

	items, err := h.service.GetMenu(c.Request.Context(), tID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, items)
}

func (h *Handler) CreateItem(c *gin.Context) {
	tIDRaw, _ := c.Get("tenantID")
	tID, _ := uuid.Parse(tIDRaw.(string))

	var req UpsertItemReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	item, err := h.service.AddItem(c.Request.Context(), tID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, item)
}

func (h *Handler) UpdateItem(c *gin.Context) {
	tIDRaw, _ := c.Get("tenantID")
	tID, _ := uuid.Parse(tIDRaw.(string))
	itemID, _ := uuid.Parse(c.Param("id"))

	var req UpsertItemReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	item, err := h.service.UpdateItem(c.Request.Context(), itemID, tID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *Handler) DeleteItem(c *gin.Context) {
	tIDRaw, _ := c.Get("tenantID")
	tID, _ := uuid.Parse(tIDRaw.(string))
	itemID, _ := uuid.Parse(c.Param("id"))

	if err := h.service.RemoveItem(c.Request.Context(), itemID, tID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Menu dihapus"})
}