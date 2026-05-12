package platformadmin

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/helwiza/backend/internal/platform/mailer"
)

func (h *Handler) SendEmail(c *gin.Context) {
	var req struct {
		To          []string          `json:"to" binding:"required"`
		Subject     string            `json:"subject" binding:"required"`
		HTML        string            `json:"html"`
		Text        string            `json:"text"`
		EventKey    string            `json:"event_key"`
		TemplateKey string            `json:"template_key"`
		Source      string            `json:"source"`
		ReplyTo     []string          `json:"reply_to"`
		Tags        map[string]string `json:"tags"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "payload email tidak valid"})
		return
	}

	if req.Tags == nil {
		req.Tags = map[string]string{}
	}
	if strings.TrimSpace(req.EventKey) != "" {
		req.Tags["event_key"] = strings.TrimSpace(req.EventKey)
	}
	if strings.TrimSpace(req.TemplateKey) != "" {
		req.Tags["template_key"] = strings.TrimSpace(req.TemplateKey)
	}
	if strings.TrimSpace(req.Source) != "" {
		req.Tags["source"] = strings.TrimSpace(req.Source)
	}

	resp, err := h.svc.SendEmail(c.Request.Context(), mailer.SendRequest{
		To:      req.To,
		Subject: strings.TrimSpace(req.Subject),
		HTML:    req.HTML,
		Text:    req.Text,
		ReplyTo: req.ReplyTo,
		Tags:    req.Tags,
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "email berhasil dikirim",
		"email_id": resp.ID,
	})
}

func (h *Handler) ListEmailLogs(c *gin.Context) {
	page := parsePage(c.Query("page"))
	pageSize := parsePageSize(c.Query("page_size"))
	items, total, err := h.svc.ListEmailLogs(
		c.Request.Context(),
		page,
		pageSize,
		c.Query("event_key"),
		c.Query("status"),
		c.Query("q"),
	)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"items":     items,
			"page":      page,
			"page_size": pageSize,
			"total":     total,
		},
	})
}

func (h *Handler) GetEmailLog(c *gin.Context) {
	data, err := h.svc.GetEmailLog(c.Request.Context(), c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	respondData(c, data)
}

func (h *Handler) ListSentEmails(c *gin.Context) {
	data, err := h.svc.ListSentEmails(c.Request.Context(), parseListLimit(c.Query("limit")))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	respondData(c, data)
}

func (h *Handler) GetSentEmail(c *gin.Context) {
	data, err := h.svc.GetSentEmail(c.Request.Context(), c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	respondData(c, data)
}

func (h *Handler) ListReceivedEmails(c *gin.Context) {
	data, err := h.svc.ListReceivedEmails(c.Request.Context(), parseListLimit(c.Query("limit")))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	respondData(c, data)
}

func (h *Handler) GetReceivedEmail(c *gin.Context) {
	data, err := h.svc.GetReceivedEmail(c.Request.Context(), c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	respondData(c, data)
}

func parseListLimit(raw string) int {
	value, err := strconv.Atoi(strings.TrimSpace(raw))
	if err != nil {
		return 20
	}
	return value
}

func parsePage(raw string) int {
	value, err := strconv.Atoi(strings.TrimSpace(raw))
	if err != nil || value <= 0 {
		return 1
	}
	return value
}

func parsePageSize(raw string) int {
	value, err := strconv.Atoi(strings.TrimSpace(raw))
	if err != nil || value <= 0 {
		return 25
	}
	if value > 200 {
		return 200
	}
	return value
}
