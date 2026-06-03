package fnb

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Handler struct {
	service *Service
}

func NewHandler(s *Service) *Handler {
	return &Handler{service: s}
}

// GetMenu mengambil daftar menu dengan filter tenant dan pencarian (query q=)
func (h *Handler) GetMenu(c *gin.Context) {
	tIDRaw, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid, Tenant ID hilang"})
		return
	}

	tID, err := uuid.Parse(tIDRaw.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format ID Tenant rusak"})
		return
	}

	// Tangkap query pencarian (misal: /fnb?q=mie)
	search := c.Query("q")

	items, err := h.service.GetMenu(c.Request.Context(), tID, search)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, items)
}

// CreateItem membuat menu baru
func (h *Handler) CreateItem(c *gin.Context) {
	tIDRaw, _ := c.Get("tenantID")
	tID, _ := uuid.Parse(tIDRaw.(string))

	var req UpsertItemReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Input tidak valid: " + err.Error()})
		return
	}

	item, err := h.service.AddItem(c.Request.Context(), tID, req)
	if err != nil {
		// Mengembalikan err.Error() agar kita bisa debug alasan database menolak datanya
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan: " + err.Error()})
		return
	}
	c.JSON(http.StatusCreated, item)
}

// UpdateItem memperbarui data menu berdasarkan ID
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
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format update tidak valid: " + err.Error()})
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Hapus gagal: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Menu berhasil dihapus"})
}

func (h *Handler) CreateOrder(c *gin.Context) {
	tID, ok := tenantIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid, Tenant ID hilang"})
		return
	}

	var req CreateOrderReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Input transaksi tidak valid: " + err.Error()})
		return
	}

	order, err := h.service.CreateOrder(c.Request.Context(), tID, c.GetString("userID"), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, order)
}

func (h *Handler) ListOrders(c *gin.Context) {
	tID, ok := tenantIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid, Tenant ID hilang"})
		return
	}
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "30"))
	orders, err := h.service.ListOrders(c.Request.Context(), tID, c.Query("source"), limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, orders)
}

func (h *Handler) OrderSummary(c *gin.Context) {
	tID, ok := tenantIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid, Tenant ID hilang"})
		return
	}
	summary, err := h.service.OrderSummary(c.Request.Context(), tID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, summary)
}

func tenantIDFromContext(c *gin.Context) (uuid.UUID, bool) {
	raw, exists := c.Get("tenantID")
	if !exists {
		return uuid.Nil, false
	}
	tID, err := uuid.Parse(raw.(string))
	return tID, err == nil
}
