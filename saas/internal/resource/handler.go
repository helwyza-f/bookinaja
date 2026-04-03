package resource

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/helwiza/saas/internal/booking"
)

type Handler struct {
	service *Service
}

func NewHandler(s *Service) *Handler {
	return &Handler{service: s}
}

// Create menangani pembuatan unit utama (POST /resources)
func (h *Handler) Create(c *gin.Context) {
	tenantID := c.MustGet("tenantID").(string)
	var req struct {
		Name     string `json:"name" binding:"required"`
		Category string `json:"category"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	res, err := h.service.CreateResource(c.Request.Context(), tenantID, req.Name, req.Category)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, res)
}

// List mengambil semua resource milik tenant (GET /resources)
func (h *Handler) List(c *gin.Context) {
	tenantID := c.MustGet("tenantID").(string)
	resources, err := h.service.ListResources(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resources)
}

// AddItem menambahkan item/opsi ke resource (POST /resources/:id/items)
func (h *Handler) AddItem(c *gin.Context) {
	resourceID := c.Param("id")
	var req struct {
		Name         string  `json:"name" binding:"required"`
		PricePerHour float64 `json:"price_per_hour"`
		PriceUnit    string  `json:"price_unit" binding:"required"` // Field baru: 'hour', 'session', 'day', 'pcs'
		ItemType     string  `json:"item_type" binding:"required"`  // 'main' atau 'addon'
		IsDefault    bool    `json:"is_default"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Lengkapi data barang: " + err.Error()})
		return
	}

	// Panggil service dengan parameter price_unit yang baru
	item, err := h.service.AddResourceItem(
		c.Request.Context(),
		resourceID,
		req.Name,
		req.PricePerHour,
		req.PriceUnit,
		req.ItemType,
		req.IsDefault,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, item)
}

// ListItems mengambil daftar item dari satu resource (GET /resources/:id/items)
func (h *Handler) ListItems(c *gin.Context) {
	id := c.Param("id")
	items, err := h.service.GetItems(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, items)
}

// Delete menghapus satu resource (DELETE /resources/:id)
func (h *Handler) Delete(c *gin.Context) {
	id := c.Param("id")
	if err := h.service.DeleteResource(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Resource deleted successfully"})
}

// UpdateItem menangani update detail item (PUT /resources-all/items/:id)
func (h *Handler) UpdateItem(c *gin.Context) {
	id := c.Param("id")
	var req booking.ResourceItem // Menggunakan struct model langsung agar fleksibel (termasuk price_unit)
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.UpdateItem(c.Request.Context(), id, req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Item updated successfully"})
}

// DeleteItem menghapus item (DELETE /resources-all/items/:id)
func (h *Handler) DeleteItem(c *gin.Context) {
	id := c.Param("id")
	if err := h.service.DeleteItem(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Item deleted successfully"})
}

// GetPublicDetail mengambil detail resource untuk halaman publik
func (h *Handler) GetPublicDetail(c *gin.Context) {
	id := c.Param("id")
	res, err := h.service.GetResourceDetail(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Resource tidak ditemukan"})
		return
	}
	c.JSON(http.StatusOK, res)
}