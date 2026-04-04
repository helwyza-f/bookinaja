package resource

import (
	"net/http"

	"github.com/gin-gonic/gin"
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
		Name        string `json:"name" binding:"required"`
		Category    string `json:"category"`
		Description string `json:"description"`
		ImageURL    string `json:"image_url"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Memanggil service yang sudah diupdate dengan parameter marketing
	res, err := h.service.CreateResource(
		c.Request.Context(), 
		tenantID, 
		req.Name, 
		req.Category, 
		req.Description, 
		req.ImageURL,
	)
	
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, res)
}

// Update menangani perubahan data utama unit (PUT /resources/:id)
func (h *Handler) Update(c *gin.Context) {
	id := c.Param("id")
	var req Resource // Menggunakan struct model agar bisa update gallery, desc, dll
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.UpdateResource(c.Request.Context(), id, req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Unit marketing data updated successfully"})
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
		Price        float64 `json:"price" binding:"required"`      
		PriceUnit    string  `json:"price_unit" binding:"required"` 
		UnitDuration int     `json:"unit_duration"`                 
		ItemType     string  `json:"item_type" binding:"required"`  
		IsDefault    bool    `json:"is_default"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Lengkapi data barang: " + err.Error()})
		return
	}

	item, err := h.service.AddResourceItem(
		c.Request.Context(),
		resourceID,
		req.Name,
		req.Price,
		req.PriceUnit,
		req.ItemType,
		req.IsDefault,
		req.UnitDuration,
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
	var req ResourceItem 
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

// GetPublicDetail mengambil detail resource (termasuk visual & items) untuk customer
func (h *Handler) GetPublicDetail(c *gin.Context) {
	id := c.Param("id")
	res, err := h.service.GetResourceDetail(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Resource tidak ditemukan"})
		return
	}
	c.JSON(http.StatusOK, res)
}