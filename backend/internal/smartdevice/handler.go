package smartdevice

import (
	"errors"
	"net/http"

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
	tenantID, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}
	items, err := h.service.List(c.Request.Context(), tenantID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *Handler) Overview(c *gin.Context) {
	tenantID, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}
	item, err := h.service.Overview(c.Request.Context(), tenantID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *Handler) Claim(c *gin.Context) {
	tenantID, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}
	var req ClaimDeviceReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data device tidak valid"})
		return
	}
	actorID := parseActorID(c.GetString("userID"))
	item, err := h.service.Claim(c.Request.Context(), tenantID.(string), actorID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "Device berhasil didaftarkan", "data": item})
}

func (h *Handler) GetDetail(c *gin.Context) {
	tenantID, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}
	item, err := h.service.GetDetail(c.Request.Context(), tenantID.(string), c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *Handler) Assign(c *gin.Context) {
	tenantID, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}
	var req AssignDeviceReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data assign tidak valid"})
		return
	}
	actorID := parseActorID(c.GetString("userID"))
	if err := h.service.Assign(c.Request.Context(), tenantID.(string), c.Param("id"), actorID, req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Device berhasil di-assign"})
}

func (h *Handler) Unassign(c *gin.Context) {
	tenantID, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}
	actorID := parseActorID(c.GetString("userID"))
	if err := h.service.Unassign(c.Request.Context(), tenantID.(string), c.Param("id"), actorID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Device berhasil dilepas dari resource"})
}

func (h *Handler) Enable(c *gin.Context) {
	h.setEnabled(c, true)
}

func (h *Handler) Disable(c *gin.Context) {
	h.setEnabled(c, false)
}

func (h *Handler) setEnabled(c *gin.Context, enabled bool) {
	tenantID, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}
	actorID := parseActorID(c.GetString("userID"))
	if err := h.service.Enable(c.Request.Context(), tenantID.(string), c.Param("id"), actorID, enabled); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	message := "Device diaktifkan"
	if !enabled {
		message = "Device dinonaktifkan"
	}
	c.JSON(http.StatusOK, gin.H{"message": message})
}

func (h *Handler) Test(c *gin.Context) {
	tenantID, exists := c.Get("tenantID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}
	var req TestDeviceReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Payload test command tidak valid"})
		return
	}
	actorID := parseActorID(c.GetString("userID"))
	command, err := h.service.SendTestCommand(c.Request.Context(), tenantID.(string), c.Param("id"), actorID, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Test command terkirim", "data": command})
}

func (h *Handler) Pair(c *gin.Context) {
	var req PairDeviceReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Payload pairing tidak valid"})
		return
	}
	device, err := h.service.Pair(c.Request.Context(), req)
	if err != nil {
		statusCode := http.StatusUnauthorized
		switch {
		case errors.Is(err, ErrDeviceNotRegistered):
			statusCode = http.StatusNotFound
		case errors.Is(err, ErrDeviceNotClaimed), errors.Is(err, ErrDeviceDisabled):
			statusCode = http.StatusConflict
		case errors.Is(err, ErrDeviceKeyMismatch):
			statusCode = http.StatusUnauthorized
		default:
			statusCode = http.StatusBadRequest
		}
		c.JSON(statusCode, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message":          "Pairing berhasil",
		"device_id":        device.DeviceID,
		"tenant_id":        device.TenantID,
		"resource_id":      device.ResourceID,
		"pairing_status":   device.PairingStatus,
		"connection_state": device.ConnectionStatus,
	})
}

func parseActorID(raw string) *uuid.UUID {
	if raw == "" {
		return nil
	}
	id, err := uuid.Parse(raw)
	if err != nil {
		return nil
	}
	return &id
}
