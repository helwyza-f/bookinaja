package paymentgateway

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func adminTenantID(c *gin.Context) (uuid.UUID, bool) {
	raw, ok := c.Get("tenantID")
	if !ok {
		return uuid.Nil, false
	}
	id, err := uuid.Parse(fmt.Sprint(raw))
	if err != nil {
		return uuid.Nil, false
	}
	return id, true
}

// Get mengembalikan konfigurasi gateway tenant (secret di-mask). Kosong bila
// belum diatur.
func (h *Handler) Get(c *gin.Context) {
	tenantID, ok := adminTenantID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "sesi tidak valid"})
		return
	}
	view, err := h.svc.Get(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal memuat konfigurasi gateway"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": view})
}

type saveReq struct {
	Provider       string `json:"provider"`
	Environment    string `json:"environment"`
	ServerKey      string `json:"server_key"`
	ClientKey      string `json:"client_key"`
	CallbackSecret string `json:"callback_secret"`
}

func (h *Handler) Save(c *gin.Context) {
	tenantID, ok := adminTenantID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "sesi tidak valid"})
		return
	}
	var req saveReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "payload tidak valid"})
		return
	}
	view, err := h.svc.Save(c.Request.Context(), tenantID, UpsertInput{
		Provider:       req.Provider,
		Environment:    req.Environment,
		ServerKey:      req.ServerKey,
		ClientKey:      req.ClientKey,
		CallbackSecret: req.CallbackSecret,
	})
	if err == ErrNoMasterKey {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "server belum dikonfigurasi untuk menyimpan kredensial gateway"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal menyimpan konfigurasi gateway"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": view})
}

func (h *Handler) Test(c *gin.Context) {
	tenantID, ok := adminTenantID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "sesi tidak valid"})
		return
	}
	view, err := h.svc.TestConnection(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": view})
}

func (h *Handler) Delete(c *gin.Context) {
	tenantID, ok := adminTenantID(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "sesi tidak valid"})
		return
	}
	if err := h.svc.Disable(c.Request.Context(), tenantID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal menonaktifkan gateway"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// PublicConfig dipakai sisi customer: apakah tenant punya auto-gateway aktif +
// client key (Snap). Tidak pernah mengembalikan server key.
func (h *Handler) PublicConfig(c *gin.Context) {
	tenantID, err := uuid.Parse(c.Param("tenantId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenant tidak valid"})
		return
	}
	cfg, err := h.svc.PublicConfig(c.Request.Context(), tenantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal memuat konfigurasi"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": cfg})
}
