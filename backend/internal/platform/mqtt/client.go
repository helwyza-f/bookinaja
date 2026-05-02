package mqtt

import (
	"context"
	"crypto/tls"
	"fmt"
	"log"
	"sync"
	"time"

	paho "github.com/eclipse/paho.mqtt.golang"
)

type Client struct {
	cfg       *Config
	tlsConfig *tls.Config
	client    paho.Client
	mu        sync.RWMutex
	subs      []subscription
}

type subscription struct {
	topic   string
	qos     byte
	handler paho.MessageHandler
}

func NewClient(cfg *Config) (*Client, error) {
	if cfg == nil {
		return nil, fmt.Errorf("mqtt config is nil")
	}
	tlsConfig, err := cfg.TLSConfig()
	if err != nil {
		return nil, err
	}

	options := paho.NewClientOptions()
	options.AddBroker(brokerURL(cfg))
	options.SetClientID(cfg.ClientID)
	options.SetConnectRetry(true)
	options.SetConnectRetryInterval(5 * time.Second)
	options.SetAutoReconnect(true)
	options.SetCleanSession(false)
	options.SetOrderMatters(false)
	options.SetKeepAlive(30 * time.Second)
	options.SetPingTimeout(10 * time.Second)
	options.SetWriteTimeout(10 * time.Second)
	options.SetConnectTimeout(15 * time.Second)

	if cfg.Username != "" {
		options.SetUsername(cfg.Username)
		options.SetPassword(cfg.Password)
	}
	if tlsConfig != nil {
		options.SetTLSConfig(tlsConfig)
	}

	mqttClient := &Client{
		cfg:       cfg,
		tlsConfig: tlsConfig,
	}

	options.OnConnect = func(client paho.Client) {
		log.Printf("mqtt connected: broker=%s client_id=%s", cfg.BrokerAddress(), cfg.ClientID)
		mqttClient.restoreSubscriptions(client)
	}
	options.OnConnectionLost = func(_ paho.Client, err error) {
		log.Printf("mqtt connection lost: %v", err)
	}
	options.OnReconnecting = func(_ paho.Client, _ *paho.ClientOptions) {
		log.Printf("mqtt reconnecting: broker=%s client_id=%s", cfg.BrokerAddress(), cfg.ClientID)
	}

	mqttClient.client = paho.NewClient(options)
	return mqttClient, nil
}

func (c *Client) Connect(ctx context.Context) error {
	if c == nil || c.client == nil {
		return fmt.Errorf("mqtt client is not initialized")
	}

	token := c.client.Connect()
	select {
	case <-ctx.Done():
		return ctx.Err()
	default:
	}
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

func (c *Client) Disconnect(quiesce uint) {
	if c == nil || c.client == nil {
		return
	}
	if c.client.IsConnected() || c.client.IsConnectionOpen() {
		c.client.Disconnect(quiesce)
		log.Printf("mqtt disconnected: client_id=%s", c.cfg.ClientID)
	}
}

func (c *Client) Publish(ctx context.Context, topic string, qos byte, retain bool, payload []byte) error {
	if c == nil || c.client == nil {
		return fmt.Errorf("mqtt client is not initialized")
	}
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

func (c *Client) Subscribe(ctx context.Context, topic string, qos byte, handler func(topic string, payload []byte)) error {
	if c == nil || c.client == nil {
		return fmt.Errorf("mqtt client is not initialized")
	}
	wrapped := func(_ paho.Client, msg paho.Message) {
		handler(msg.Topic(), msg.Payload())
	}

	c.mu.Lock()
	c.subs = append(c.subs, subscription{topic: topic, qos: qos, handler: wrapped})
	c.mu.Unlock()

	if !c.IsConnected() {
		return nil
	}
	return c.subscribeWithContext(ctx, topic, qos, wrapped)
}

func (c *Client) IsConnected() bool {
	if c == nil || c.client == nil {
		return false
	}
	return c.client.IsConnected()
}

func (c *Client) BrokerURL() string {
	return brokerURL(c.cfg)
}

func (c *Client) restoreSubscriptions(client paho.Client) {
	c.mu.RLock()
	subs := append([]subscription(nil), c.subs...)
	c.mu.RUnlock()
	for _, sub := range subs {
		token := client.Subscribe(sub.topic, sub.qos, sub.handler)
		if token.WaitTimeout(10*time.Second) && token.Error() != nil {
			log.Printf("mqtt subscribe failed: topic=%s err=%v", sub.topic, token.Error())
			continue
		}
		log.Printf("mqtt subscribed: topic=%s qos=%d", sub.topic, sub.qos)
	}
}

func (c *Client) subscribeWithContext(ctx context.Context, topic string, qos byte, handler paho.MessageHandler) error {
	token := c.client.Subscribe(topic, qos, handler)
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

func brokerURL(cfg *Config) string {
	scheme := "tcp"
	if cfg.UseTLS {
		scheme = "ssl"
	}
	return fmt.Sprintf("%s://%s", scheme, cfg.BrokerAddress())
}
