package midtrans

import (
	"log"
	"net/http"
	"os"
	"strings"

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

// XenditWebhook menerima callback invoice Xendit. Verifikasi memakai header
// statis `x-callback-token` (dibandingkan dengan XENDIT_CALLBACK_TOKEN), lalu
// diteruskan ke pipeline settlement yang sama dengan Midtrans.
func (h *Handler) XenditWebhook(c *gin.Context) {
	expected := strings.TrimSpace(os.Getenv("XENDIT_CALLBACK_TOKEN"))
	if expected == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "xendit callback token belum dikonfigurasi"})
		return
	}
	if strings.TrimSpace(c.GetHeader("x-callback-token")) != expected {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid callback token"})
		return
	}

	var payload map[string]any
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "payload invalid"})
		return
	}

	if err := h.svc.HandleXenditNotification(c.Request.Context(), payload); err != nil {
		log.Printf("[XENDIT WEBHOOK] failed external_id=%v status=%v error=%v", payload["external_id"], payload["status"], err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"ok": true})
}
