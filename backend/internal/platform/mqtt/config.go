package mqtt

import (
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

type Config struct {
	BrokerHost    string
	BrokerPort    int
	WSPort        int
	UseTLS        bool
	CACertPath    string
	ClientID      string
	Username      string
	Password      string
	ConnectOnBoot bool
	APIBaseURL    string
	AppID         string
	AppSecret     string
}

func LoadConfig() (*Config, error) {
	cfg := &Config{
		BrokerHost:    strings.TrimSpace(os.Getenv("MQTT_BROKER_HOST")),
		BrokerPort:    envInt("MQTT_BROKER_PORT", 1883),
		WSPort:        envInt("MQTT_WS_PORT", 8083),
		UseTLS:        envBool("MQTT_USE_TLS", false),
		CACertPath:    strings.TrimSpace(os.Getenv("MQTT_CA_CERT_PATH")),
		ClientID:      strings.TrimSpace(os.Getenv("MQTT_CLIENT_ID")),
		Username:      strings.TrimSpace(os.Getenv("MQTT_USERNAME")),
		Password:      os.Getenv("MQTT_PASSWORD"),
		ConnectOnBoot: envBool("MQTT_CONNECT_ON_BOOT", false),
		APIBaseURL:    strings.TrimSpace(os.Getenv("MQTT_API_BASE_URL")),
		AppID:         strings.TrimSpace(os.Getenv("MQTT_APP_ID")),
		AppSecret:     strings.TrimSpace(os.Getenv("MQTT_APP_SECRET")),
	}

	if err := cfg.Validate(); err != nil {
		return nil, err
	}

	return cfg, nil
}

func (c *Config) Enabled() bool {
	return strings.TrimSpace(c.BrokerHost) != ""
}

func (c *Config) Validate() error {
	if !c.Enabled() {
		return nil
	}

	if c.BrokerPort <= 0 {
		return fmt.Errorf("mqtt broker port is invalid")
	}
	if c.ClientID == "" {
		return fmt.Errorf("mqtt client id is required when mqtt is enabled")
	}
	if c.WSPort <= 0 {
		return fmt.Errorf("mqtt websocket port is invalid")
	}
	if strings.TrimSpace(c.APIBaseURL) != "" {
		if _, err := url.ParseRequestURI(c.APIBaseURL); err != nil {
			return fmt.Errorf("mqtt api base url is invalid: %w", err)
		}
	}
	if (c.AppID == "") != (c.AppSecret == "") {
		return fmt.Errorf("mqtt app credentials must be provided together")
	}
	return nil
}

func (c *Config) BrokerAddress() string {
	return fmt.Sprintf("%s:%d", c.BrokerHost, c.BrokerPort)
}

func (c *Config) WebSocketAddress() string {
	scheme := "ws"
	if c.UseTLS {
		scheme = "wss"
	}
	return fmt.Sprintf("%s://%s:%d", scheme, c.BrokerHost, c.WSPort)
}

func (c *Config) TLSConfig() (*tls.Config, error) {
	if !c.Enabled() || !c.UseTLS {
		return nil, nil
	}

	pool, err := x509.SystemCertPool()
	if err != nil || pool == nil {
		pool = x509.NewCertPool()
	}

	if strings.TrimSpace(c.CACertPath) != "" {
		certPath, err := resolvePath(c.CACertPath)
		if err != nil {
			return nil, err
		}
		pemBytes, err := os.ReadFile(certPath)
		if err != nil {
			return nil, fmt.Errorf("read mqtt ca certificate: %w", err)
		}
		if ok := pool.AppendCertsFromPEM(pemBytes); !ok {
			return nil, fmt.Errorf("parse mqtt ca certificate failed")
		}
	}

	return &tls.Config{
		MinVersion: tls.VersionTLS12,
		RootCAs:    pool,
		ServerName: c.BrokerHost,
	}, nil
}

func resolvePath(path string) (string, error) {
	if filepath.IsAbs(path) {
		return path, nil
	}
	absPath, err := filepath.Abs(path)
	if err != nil {
		return "", fmt.Errorf("resolve mqtt ca cert path: %w", err)
	}
	return absPath, nil
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
