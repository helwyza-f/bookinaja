package midtrans

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) Webhook(c *gin.Context) {
	var payload map[string]any
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "payload invalid"})
		return
	}

	if err := h.svc.HandleNotification(c.Request.Context(), payload); err != nil {
		log.Printf("[MIDTRANS WEBHOOK] failed order_id=%v transaction_status=%v error=%v", payload["order_id"], payload["transaction_status"], err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"ok": true})
}
