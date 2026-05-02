package main

import (
	"bytes"
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"log"
	"math/rand/v2"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	paho "github.com/eclipse/paho.mqtt.golang"
	"github.com/joho/godotenv"
)

type simulatorState struct {
	DeviceID      string
	DeviceKey     string
	Firmware      string
	APIURL        string
	Heartbeat     time.Duration
	LastCommandID string
}

type mqttConfig struct {
	BrokerHost string
	BrokerPort int
	UseTLS     bool
	CACertPath string
	CACertPEM  string
	ClientID   string
	Username   string
	Password   string
}

type mqttClient struct {
	client paho.Client
}

type setCommand struct {
	CommandID  string `json:"command_id"`
	Event      string `json:"event"`
	AudioIndex int    `json:"audio_index"`
	LightMode  string `json:"light_mode"`
	Color      string `json:"color"`
	Volume     int    `json:"volume"`
}

func main() {
	_ = godotenv.Load()
	_ = godotenv.Load(".env")

	state := simulatorState{
		DeviceID:  envOr("DEVICE_SIM_DEVICE_ID", "SIM-BOOKINAJA-01"),
		DeviceKey: envOr("DEVICE_SIM_DEVICE_KEY", "SIM-KEY-123"),
		Firmware:  envOr("DEVICE_SIM_FIRMWARE", "sim-1.0.0"),
		APIURL:    strings.TrimRight(envOr("DEVICE_SIM_API_URL", "http://localhost:8080/api/v1/public"), "/"),
		Heartbeat: envDurationSeconds("DEVICE_SIM_HEARTBEAT_SEC", 20),
	}

	if envBool("DEVICE_SIM_AUTO_PAIR", false) {
		if err := pairDevice(state); err != nil {
			log.Printf("device-sim pair warning: %v", err)
		} else {
			log.Printf("device-sim paired: device_id=%s", state.DeviceID)
		}
	}

	cfg, err := loadMQTTConfig(state.DeviceID)
	if err != nil {
		log.Fatalf("device-sim mqtt config error: %v", err)
	}

	client, err := newMQTTClient(cfg)
	if err != nil {
		log.Fatalf("device-sim mqtt client init error: %v", err)
	}

	connectCtx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	if err := client.connect(connectCtx); err != nil {
		log.Fatalf("device-sim mqtt connect error: %v", err)
	}
	defer client.disconnect(250)

	setTopic := fmt.Sprintf("bookinaja/devices/%s/set", state.DeviceID)
	stateTopic := fmt.Sprintf("bookinaja/devices/%s/state", state.DeviceID)
	ackTopic := fmt.Sprintf("bookinaja/devices/%s/ack", state.DeviceID)

	if err := client.subscribe(context.Background(), setTopic, 1, func(payload []byte) {
		handleSetCommand(client, ackTopic, stateTopic, &state, payload)
	}); err != nil {
		log.Fatalf("device-sim subscribe error: %v", err)
	}

	_ = publishState(client, stateTopic, state, "online")

	ticker := time.NewTicker(state.Heartbeat)
	defer ticker.Stop()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	for {
		select {
		case <-ticker.C:
			_ = publishState(client, stateTopic, state, "online")
		case sig := <-sigCh:
			log.Printf("device-sim shutting down: signal=%s", sig)
			_ = client.publish(context.Background(), stateTopic, 1, false, []byte("offline"))
			return
		}
	}
}

func loadMQTTConfig(deviceID string) (*mqttConfig, error) {
	cfg := &mqttConfig{
		BrokerHost: envOr("MQTT_BROKER_HOST", ""),
		BrokerPort: envInt("MQTT_BROKER_PORT", 1883),
		UseTLS:     envBool("MQTT_USE_TLS", false),
		CACertPath: envOr("MQTT_CA_CERT_PATH", ""),
		CACertPEM:  normalizePEMEnv(os.Getenv("MQTT_CA_CERT_PEM")),
		ClientID:   fmt.Sprintf("device-sim-%s", slugify(deviceID)),
		Username:   envOr("MQTT_USERNAME", ""),
		Password:   os.Getenv("MQTT_PASSWORD"),
	}
	if strings.TrimSpace(cfg.BrokerHost) == "" {
		return nil, fmt.Errorf("MQTT_BROKER_HOST is required")
	}
	return cfg, nil
}

func newMQTTClient(cfg *mqttConfig) (*mqttClient, error) {
	options := paho.NewClientOptions()
	options.AddBroker(brokerURL(cfg))
	options.SetClientID(cfg.ClientID)
	options.SetAutoReconnect(true)
	options.SetCleanSession(false)
	options.SetConnectRetry(true)
	options.SetConnectRetryInterval(5 * time.Second)
	options.SetKeepAlive(30 * time.Second)
	options.SetPingTimeout(10 * time.Second)
	options.SetWriteTimeout(10 * time.Second)
	options.SetConnectTimeout(15 * time.Second)
	options.OnConnect = func(_ paho.Client) {
		log.Printf("device-sim mqtt connected: broker=%s client_id=%s", brokerAddress(cfg), cfg.ClientID)
	}
	options.OnConnectionLost = func(_ paho.Client, err error) {
		log.Printf("device-sim mqtt connection lost: %v", err)
	}

	if cfg.Username != "" {
		options.SetUsername(cfg.Username)
		options.SetPassword(cfg.Password)
	}
	if cfg.UseTLS {
		tlsConfig, err := loadTLSConfig(cfg)
		if err != nil {
			return nil, err
		}
		options.SetTLSConfig(tlsConfig)
	}
	return &mqttClient{client: paho.NewClient(options)}, nil
}

func loadTLSConfig(cfg *mqttConfig) (*tls.Config, error) {
	pool, err := x509.SystemCertPool()
	if err != nil || pool == nil {
		pool = x509.NewCertPool()
	}

	switch {
	case strings.TrimSpace(cfg.CACertPEM) != "":
		if ok := pool.AppendCertsFromPEM([]byte(cfg.CACertPEM)); !ok {
			return nil, fmt.Errorf("failed to parse CA certificate from MQTT_CA_CERT_PEM")
		}
	case strings.TrimSpace(cfg.CACertPath) != "":
		pemBytes, err := os.ReadFile(cfg.CACertPath)
		if err != nil {
			return nil, err
		}
		if ok := pool.AppendCertsFromPEM(pemBytes); !ok {
			return nil, fmt.Errorf("failed to parse CA certificate")
		}
	}
	return &tls.Config{
		MinVersion: tls.VersionTLS12,
		RootCAs:    pool,
		ServerName: cfg.BrokerHost,
	}, nil
}

func (c *mqttClient) connect(ctx context.Context) error {
	token := c.client.Connect()
	for {
		if token.WaitTimeout(250 * time.Millisecond) {
			return token.Error()
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}
	}
}

func (c *mqttClient) disconnect(quiesce uint) {
	if c == nil || c.client == nil {
		return
	}
	if c.client.IsConnected() || c.client.IsConnectionOpen() {
		c.client.Disconnect(quiesce)
	}
}

func (c *mqttClient) publish(ctx context.Context, topic string, qos byte, retain bool, payload []byte) error {
	token := c.client.Publish(topic, qos, retain, payload)
	for {
		if token.WaitTimeout(250 * time.Millisecond) {
			return token.Error()
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}
	}
}

func (c *mqttClient) subscribe(ctx context.Context, topic string, qos byte, handler func(payload []byte)) error {
	token := c.client.Subscribe(topic, qos, func(_ paho.Client, message paho.Message) {
		handler(message.Payload())
	})
	for {
		if token.WaitTimeout(250 * time.Millisecond) {
			return token.Error()
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}
	}
}

func pairDevice(state simulatorState) error {
	body, _ := json.Marshal(map[string]string{
		"device_id":  state.DeviceID,
		"device_key": state.DeviceKey,
	})
	resp, err := http.Post(state.APIURL+"/devices/pair", "application/json", bytes.NewReader(body))
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return fmt.Errorf("pairing rejected: status=%d", resp.StatusCode)
	}
	return nil
}

func handleSetCommand(client *mqttClient, ackTopic, stateTopic string, state *simulatorState, payload []byte) {
	var cmd setCommand
	if err := json.Unmarshal(payload, &cmd); err != nil {
		log.Printf("device-sim invalid command payload: %v", err)
		return
	}
	state.LastCommandID = cmd.CommandID
	log.Printf("device-sim command received: event=%s audio=%d light=%s color=%s volume=%d", cmd.Event, cmd.AudioIndex, cmd.LightMode, cmd.Color, cmd.Volume)

	ackPayload, _ := json.Marshal(map[string]string{
		"command_id":  cmd.CommandID,
		"device_id":   state.DeviceID,
		"result":      "accepted",
		"received_at": time.Now().UTC().Format(time.RFC3339),
	})
	if err := client.publish(context.Background(), ackTopic, 1, false, ackPayload); err != nil {
		log.Printf("device-sim ack publish failed: %v", err)
	}
	_ = publishState(client, stateTopic, *state, "online")
}

func publishState(client *mqttClient, stateTopic string, state simulatorState, status string) error {
	payload, _ := json.Marshal(map[string]any{
		"device_id":        state.DeviceID,
		"status":           status,
		"firmware_version": state.Firmware,
		"wifi_rssi":        -40 - rand.IntN(25),
		"ip_address":       "192.168.1.77",
		"last_command_id":  state.LastCommandID,
		"uptime_seconds":   time.Now().Unix(),
		"free_heap":        120000 + rand.IntN(15000),
	})
	return client.publish(context.Background(), stateTopic, 1, false, payload)
}

func brokerURL(cfg *mqttConfig) string {
	scheme := "tcp"
	if cfg.UseTLS {
		scheme = "ssl"
	}
	return fmt.Sprintf("%s://%s", scheme, brokerAddress(cfg))
}

func brokerAddress(cfg *mqttConfig) string {
	return fmt.Sprintf("%s:%d", cfg.BrokerHost, cfg.BrokerPort)
}

func envOr(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

func envInt(key string, fallback int) int {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	value, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	return value
}

func envBool(key string, fallback bool) bool {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	value, err := strconv.ParseBool(raw)
	if err != nil {
		return fallback
	}
	return value
}

func envDurationSeconds(key string, fallback int) time.Duration {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return time.Duration(fallback) * time.Second
	}
	value, err := strconv.Atoi(raw)
	if err != nil || value <= 0 {
		return time.Duration(fallback) * time.Second
	}
	return time.Duration(value) * time.Second
}

func normalizePEMEnv(raw string) string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return ""
	}
	if len(trimmed) >= 2 {
		if (strings.HasPrefix(trimmed, "\"") && strings.HasSuffix(trimmed, "\"")) ||
			(strings.HasPrefix(trimmed, "'") && strings.HasSuffix(trimmed, "'")) {
			trimmed = strings.TrimSpace(trimmed[1 : len(trimmed)-1])
		}
	}
	replacer := strings.NewReplacer(`\r\n`, "\n", `\n`, "\n", `\r`, "\r")
	return replacer.Replace(trimmed)
}

func slugify(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	value = strings.ReplaceAll(value, " ", "-")
	value = strings.ReplaceAll(value, "_", "-")
	return value
}
