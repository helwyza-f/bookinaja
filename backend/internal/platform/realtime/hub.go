package realtime

import (
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"
)

type Hub struct {
	mu           sync.RWMutex
	channels     map[string]map[*Client]struct{}
	clientCount  int
}

type Broadcaster interface {
	Publish(channel string, event Event) error
}

func NewHub() *Hub {
	return &Hub{
		channels: make(map[string]map[*Client]struct{}),
	}
}

func (h *Hub) AddClient(c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.clientCount++
}

func (h *Hub) removeClient(c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	for channel := range c.channels {
		if clients, ok := h.channels[channel]; ok {
			delete(clients, c)
			if len(clients) == 0 {
				delete(h.channels, channel)
			}
		}
	}
	if h.clientCount > 0 {
		h.clientCount--
	}
	close(c.send)
}

func (h *Hub) subscribe(c *Client, channel string) error {
	channel = strings.TrimSpace(channel)
	if channel == "" {
		return fmt.Errorf("channel kosong")
	}
	if err := validateChannel(c.principal, channel); err != nil {
		return err
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	if _, ok := h.channels[channel]; !ok {
		h.channels[channel] = map[*Client]struct{}{}
	}
	h.channels[channel][c] = struct{}{}
	c.channels[channel] = struct{}{}
	return nil
}

func (h *Hub) unsubscribe(c *Client, channel string) {
	channel = strings.TrimSpace(channel)
	if channel == "" {
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()
	delete(c.channels, channel)
	if clients, ok := h.channels[channel]; ok {
		delete(clients, c)
		if len(clients) == 0 {
			delete(h.channels, channel)
		}
	}
}

func (h *Hub) Publish(channel string, event Event) error {
	channel = strings.TrimSpace(channel)
	if channel == "" {
		return fmt.Errorf("channel kosong")
	}

	event.Channel = channel
	if event.Version == 0 {
		event.Version = 1
	}
	if event.OccurredAt.IsZero() {
		event.OccurredAt = time.Now().UTC()
	}

	body, err := json.Marshal(event)
	if err != nil {
		return err
	}

	h.mu.RLock()
	clients := h.channels[channel]
	targets := make([]*Client, 0, len(clients))
	for client := range clients {
		targets = append(targets, client)
	}
	h.mu.RUnlock()

	for _, client := range targets {
		select {
		case client.send <- body:
		default:
		}
	}

	return nil
}

func validateChannel(principal *Principal, channel string) error {
	if principal == nil {
		return fmt.Errorf("principal websocket tidak valid")
	}

	if strings.HasPrefix(channel, "tenant:") {
		if principal.AuthType != "admin" {
			return fmt.Errorf("channel tenant hanya untuk admin/staff")
		}
		parts := strings.Split(channel, ":")
		if len(parts) < 2 || strings.TrimSpace(parts[1]) == "" {
			return fmt.Errorf("format channel tenant tidak valid")
		}
		if principal.TenantID == "" || principal.TenantID != parts[1] {
			return fmt.Errorf("akses tenant websocket ditolak")
		}
		return nil
	}

	if strings.HasPrefix(channel, "customer:") {
		if principal.AuthType != "customer" {
			return fmt.Errorf("channel customer hanya untuk customer")
		}
		parts := strings.Split(channel, ":")
		if len(parts) < 4 {
			return fmt.Errorf("format channel customer tidak valid")
		}
		if principal.CustomerID == "" || principal.CustomerID != parts[1] {
			return fmt.Errorf("akses customer websocket ditolak")
		}
		return nil
	}

	return fmt.Errorf("channel websocket tidak dikenali")
}
