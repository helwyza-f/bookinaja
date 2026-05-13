package realtime

import (
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

type Handler struct {
	hub      *Hub
	upgrader websocket.Upgrader
}

func NewHandler(hub *Hub) *Handler {
	return &Handler{
		hub: hub,
		upgrader: websocket.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
			CheckOrigin:     websocketOriginAllowed,
		},
	}
}

func (h *Handler) ServeWS(c *gin.Context) {
	principal, err := Authenticate(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	conn, err := h.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}

	client := newClient(h.hub, conn, principal)
	h.hub.AddClient(client)
	client.writeSystem("welcome", map[string]any{
		"auth_type": principal.AuthType,
		"tenant_id": principal.TenantID,
	})

	go client.writePump()
	go client.readPump()
}

func websocketOriginAllowed(r *http.Request) bool {
	origin := strings.TrimSpace(r.Header.Get("Origin"))
	if origin == "" {
		return true
	}

	allowed := []string{
		"http://localhost:3000",
		"http://bookinaja.local:3000",
		"http://lvh.me:3000",
		"https://bookinaja.com",
		"https://www.bookinaja.com",
	}
	if domain := strings.TrimSpace(os.Getenv("APP_DOMAIN")); domain != "" {
		allowed = append(allowed, "https://"+domain, "http://"+domain)
	}

	for _, candidate := range allowed {
		if origin == candidate {
			return true
		}
	}

	return strings.HasSuffix(origin, ".bookinaja.com") ||
		strings.HasSuffix(origin, ".bookinaja.local:3000") ||
		strings.HasSuffix(origin, ".lvh.me:3000")
}
