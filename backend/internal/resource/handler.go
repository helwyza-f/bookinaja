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

// --- PUBLIC ENDPOINTS (No Login Required) ---

// ListPublic mengambil katalog resource ringan untuk surface publik.
func (h *Handler) ListPublic(c *gin.Context) {
	// Ambil tenantID dari context (disediakan oleh middleware TenantIdentifier)
	tenantID, exists := c.Get("tenantID")
	if !exists || tenantID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Identitas bisnis diperlukan"})
		return
	}

	resources, err := h.service.ListPublicCatalog(c.Request.Context(), tenantID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil katalog"})
		return
	}
	c.JSON(http.StatusOK, resources)
}

// GetPublicDetail mengambil detail resource + items (Price/Addons) untuk customer
func (h *Handler) GetPublicDetail(c *gin.Context) {
	id := c.Param("id")
	res, err := h.service.GetResourceDetail(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Resource tidak ditemukan"})
		return
	}
	c.JSON(http.StatusOK, res)
}

// GetByID mengambil satu detail resource untuk dashboard admin
func (h *Handler) GetByID(c *gin.Context) {
	id := c.Param("id")

	// Kita gunakan fungsi yang sama dengan public detail karena
	// strukturnya identik (Resource + Items), tapi lewat jalur admin.
	res, err := h.service.GetResourceDetail(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Resource tidak ditemukan"})
		return
	}

	c.JSON(http.StatusOK, res)
}

// --- ADMIN ENDPOINTS (Auth Required) ---

// Create menangani pembuatan unit utama (POST /api/v1/resources-all)
func (h *Handler) Create(c *gin.Context) {
	tenantID := c.MustGet("tenantID").(string)

	var req struct {
		Name          string `json:"name" binding:"required"`
		Category      string `json:"category"`
		Description   string `json:"description"`
		ImageURL      string `json:"image_url"`
		OperatingMode string `json:"operating_mode"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data tidak valid: " + err.Error()})
		return
	}

	res, err := h.service.CreateResource(
		c.Request.Context(),
		tenantID,
		req.Name,
		req.Category,
		req.Description,
		req.ImageURL,
		req.OperatingMode,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, res)
}

// Update menangani perubahan data utama unit (PUT /resources-all/:id)
func (h *Handler) Update(c *gin.Context) {
	id := c.Param("id")
	var req Resource

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

// List mengambil semua resource milik tenant untuk tabel admin
func (h *Handler) List(c *gin.Context) {
	tenantID := c.MustGet("tenantID").(string)
	resources, err := h.service.ListResources(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resources)
}

func (h *Handler) ListSummary(c *gin.Context) {
	tenantID := c.MustGet("tenantID").(string)
	items, err := h.service.ListResourceSummaries(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *Handler) ListAdminCatalog(c *gin.Context) {
	tenantID := c.MustGet("tenantID").(string)
	items, err := h.service.ListAdminResources(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *Handler) ListPricingCatalog(c *gin.Context) {
	tenantID := c.MustGet("tenantID").(string)
	items, err := h.service.ListPricingCatalog(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *Handler) ListAddonCatalog(c *gin.Context) {
	tenantID := c.MustGet("tenantID").(string)
	items, err := h.service.ListAddonCatalog(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *Handler) ListPOSCatalog(c *gin.Context) {
	tenantID := c.MustGet("tenantID").(string)
	items, err := h.service.ListPOSCatalog(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *Handler) ListDeviceMap(c *gin.Context) {
	tenantID := c.MustGet("tenantID").(string)
	items, err := h.service.ListDeviceMap(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

// AddItem menambahkan opsi harga/addons ke resource (POST /resources-all/:id/items)
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

// ListItems mengambil daftar item (GET /resources-all/:id/items)
func (h *Handler) ListItems(c *gin.Context) {
	id := c.Param("id")
	items, err := h.service.GetItems(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, items)
}

// Delete menghapus satu resource (DELETE /resources-all/:id)
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
