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

// GetMenu sekarang mendukung pencarian via query parameter ?q=...
func (h *Handler) GetMenu(c *gin.Context) {
	tIDRaw, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Tenant ID tidak ditemukan dalam context"})
		return
	}
	
	tID, err := uuid.Parse(tIDRaw.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format Tenant ID tidak valid"})
		return
	}

	// Menangkap keyword pencarian dari URL: /api/v1/fnb/menu?q=kopi
	search := c.Query("q")

	items, err := h.service.GetMenu(c.Request.Context(), tID, search)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil menu"})
		return
	}
	c.JSON(http.StatusOK, items)
}

// CreateItem menangani penambahan menu baru (termasuk description & image_url)
func (h *Handler) CreateItem(c *gin.Context) {
	tIDRaw, _ := c.Get("tenantID")
	tID, _ := uuid.Parse(tIDRaw.(string))

	var req UpsertItemReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data menu tidak valid: " + err.Error()})
		return
	}

	item, err := h.service.AddItem(c.Request.Context(), tID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan menu"})
		return
	}
	c.JSON(http.StatusCreated, item)
}

// UpdateItem menangani perubahan detail menu
func (h *Handler) UpdateItem(c *gin.Context) {
	tIDRaw, _ := c.Get("tenantID")
	tID, _ := uuid.Parse(tIDRaw.(string))
	
	itemID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID menu tidak valid"})
		return
	}

	var req UpsertItemReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Update data tidak valid: " + err.Error()})
		return
	}

	item, err := h.service.UpdateItem(c.Request.Context(), itemID, tID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, item)
}

// DeleteItem menghapus menu secara permanen
func (h *Handler) DeleteItem(c *gin.Context) {
	tIDRaw, _ := c.Get("tenantID")
	tID, _ := uuid.Parse(tIDRaw.(string))
	
	itemID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID menu tidak valid"})
		return
	}

	if err := h.service.RemoveItem(c.Request.Context(), itemID, tID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus menu"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Menu berhasil dihapus"})
}