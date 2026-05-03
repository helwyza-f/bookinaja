package realtime

import (
	"encoding/json"
	"log"
	"time"

	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 8 * 1024
)

type Client struct {
	hub       *Hub
	conn      *websocket.Conn
	send      chan []byte
	principal *Principal
	channels  map[string]struct{}
}

func newClient(hub *Hub, conn *websocket.Conn, principal *Principal) *Client {
	return &Client{
		hub:       hub,
		conn:      conn,
		send:      make(chan []byte, 64),
		principal: principal,
		channels:  map[string]struct{}{},
	}
}

func (c *Client) readPump() {
	defer func() {
		c.hub.removeClient(c)
		_ = c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		return c.conn.SetReadDeadline(time.Now().Add(pongWait))
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			return
		}

		var msg clientMessage
		if err := json.Unmarshal(message, &msg); err != nil {
			c.writeSystem("error", map[string]any{"message": "format pesan websocket tidak valid"})
			continue
		}

		switch msg.Action {
		case "subscribe":
			for _, channel := range msg.Channels {
				if err := c.hub.subscribe(c, channel); err != nil {
					c.writeSystem("subscription_error", map[string]any{"channel": channel, "message": err.Error()})
					continue
				}
				c.writeSystem("subscribed", map[string]any{"channel": channel})
			}
		case "unsubscribe":
			for _, channel := range msg.Channels {
				c.hub.unsubscribe(c, channel)
				c.writeSystem("unsubscribed", map[string]any{"channel": channel})
			}
		case "ping":
			c.writeSystem("pong", map[string]any{"ts": time.Now().UTC()})
		default:
			c.writeSystem("error", map[string]any{"message": "action websocket tidak dikenali"})
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		_ = c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			writer, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			if _, err := writer.Write(message); err != nil {
				_ = writer.Close()
				return
			}
			if err := writer.Close(); err != nil {
				return
			}
		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *Client) writeSystem(eventType string, payload map[string]any) {
	body, err := json.Marshal(map[string]any{
		"type":       eventType,
		"occurred_at": time.Now().UTC(),
		"summary":    payload,
	})
	if err != nil {
		log.Printf("[REALTIME] marshal system event failed: %v", err)
		return
	}
	select {
	case c.send <- body:
	default:
	}
}

