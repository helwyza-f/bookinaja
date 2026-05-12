package mailer

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"
)

const resendBaseURL = "https://api.resend.com"

type Provider interface {
	Enabled() bool
	Send(ctx context.Context, req SendRequest) (*SendResponse, error)
	ListSent(ctx context.Context, limit int) (*SentListResponse, error)
	GetSent(ctx context.Context, id string) (*SentEmail, error)
	ListReceived(ctx context.Context, limit int) (*ReceivedListResponse, error)
	GetReceived(ctx context.Context, id string) (*ReceivedEmail, error)
}

type Resend struct {
	apiKey   string
	from     string
	fromName string
	client   *http.Client
}

type SendRequest struct {
	To      []string          `json:"to"`
	Subject string            `json:"subject"`
	HTML    string            `json:"html,omitempty"`
	Text    string            `json:"text,omitempty"`
	ReplyTo []string          `json:"reply_to,omitempty"`
	Tags    map[string]string `json:"tags,omitempty"`
}

type SendResponse struct {
	ID string `json:"id"`
}

type SentListResponse struct {
	Object  string      `json:"object"`
	HasMore bool        `json:"has_more"`
	Data    []SentEmail `json:"data"`
}

type SentEmail struct {
	ID          string          `json:"id"`
	To          []string        `json:"to"`
	From        string          `json:"from"`
	CreatedAt   string          `json:"created_at"`
	Subject     string          `json:"subject"`
	HTML        string          `json:"html,omitempty"`
	Text        *string         `json:"text,omitempty"`
	BCC         []string        `json:"bcc,omitempty"`
	CC          []string        `json:"cc,omitempty"`
	ReplyTo     []string        `json:"reply_to,omitempty"`
	LastEvent   string          `json:"last_event,omitempty"`
	ScheduledAt *string         `json:"scheduled_at,omitempty"`
	Tags        []EmailTagEntry `json:"tags,omitempty"`
}

type ReceivedListResponse struct {
	Object  string          `json:"object"`
	HasMore bool            `json:"has_more"`
	Data    []ReceivedEmail `json:"data"`
}

type ReceivedEmail struct {
	ID          string            `json:"id"`
	To          []string          `json:"to"`
	From        string            `json:"from"`
	CreatedAt   string            `json:"created_at"`
	Subject     string            `json:"subject"`
	HTML        string            `json:"html,omitempty"`
	Text        string            `json:"text,omitempty"`
	BCC         []string          `json:"bcc,omitempty"`
	CC          []string          `json:"cc,omitempty"`
	ReplyTo     []string          `json:"reply_to,omitempty"`
	MessageID   string            `json:"message_id,omitempty"`
	Headers     map[string]string `json:"headers,omitempty"`
	Attachments []Attachment      `json:"attachments,omitempty"`
}

type Attachment struct {
	ID                 string `json:"id"`
	Filename           string `json:"filename"`
	ContentType        string `json:"content_type"`
	ContentID          string `json:"content_id"`
	ContentDisposition string `json:"content_disposition"`
	Size               int64  `json:"size"`
}

type EmailTagEntry struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

type resendErrorEnvelope struct {
	Message string `json:"message"`
	Name    string `json:"name"`
}

var (
	httpClientOnce sync.Once
	sharedClient   *http.Client
)

func NewResendFromEnv() *Resend {
	apiKey := strings.TrimSpace(os.Getenv("RESEND_API_KEY"))
	from := strings.TrimSpace(os.Getenv("MAIL_FROM"))
	fromName := strings.TrimSpace(os.Getenv("MAIL_FROM_NAME"))
	return &Resend{
		apiKey:   apiKey,
		from:     from,
		fromName: fromName,
		client:   getHTTPClient(),
	}
}

func (r *Resend) Enabled() bool {
	return r != nil && r.apiKey != "" && r.from != ""
}

func (r *Resend) Send(ctx context.Context, req SendRequest) (*SendResponse, error) {
	if !r.Enabled() {
		return nil, fmt.Errorf("resend belum dikonfigurasi")
	}

	payload := map[string]any{
		"from":    r.formattedFrom(),
		"to":      req.To,
		"subject": strings.TrimSpace(req.Subject),
	}
	if html := strings.TrimSpace(req.HTML); html != "" {
		payload["html"] = html
	}
	if text := strings.TrimSpace(req.Text); text != "" {
		payload["text"] = text
	}
	if len(req.ReplyTo) > 0 {
		payload["reply_to"] = req.ReplyTo
	}
	if len(req.Tags) > 0 {
		tags := make([]map[string]string, 0, len(req.Tags))
		for name, value := range req.Tags {
			name = strings.TrimSpace(name)
			value = strings.TrimSpace(value)
			if name == "" || value == "" {
				continue
			}
			tags = append(tags, map[string]string{"name": name, "value": value})
		}
		if len(tags) > 0 {
			payload["tags"] = tags
		}
	}

	var resp SendResponse
	if err := r.doJSON(ctx, http.MethodPost, "/emails", nil, payload, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

func (r *Resend) ListSent(ctx context.Context, limit int) (*SentListResponse, error) {
	var resp SentListResponse
	if err := r.doJSON(ctx, http.MethodGet, "/emails", buildListQuery(limit), nil, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

func (r *Resend) GetSent(ctx context.Context, id string) (*SentEmail, error) {
	var resp SentEmail
	if err := r.doJSON(ctx, http.MethodGet, "/emails/"+url.PathEscape(strings.TrimSpace(id)), nil, nil, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

func (r *Resend) ListReceived(ctx context.Context, limit int) (*ReceivedListResponse, error) {
	var resp ReceivedListResponse
	if err := r.doJSON(ctx, http.MethodGet, "/emails/receiving", buildListQuery(limit), nil, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

func (r *Resend) GetReceived(ctx context.Context, id string) (*ReceivedEmail, error) {
	var resp ReceivedEmail
	if err := r.doJSON(ctx, http.MethodGet, "/emails/receiving/"+url.PathEscape(strings.TrimSpace(id)), nil, nil, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

func (r *Resend) formattedFrom() string {
	if r.fromName == "" {
		return r.from
	}
	return fmt.Sprintf("%s <%s>", r.fromName, r.from)
}

func (r *Resend) doJSON(ctx context.Context, method, path string, query url.Values, payload any, target any) error {
	if !r.Enabled() {
		return fmt.Errorf("resend belum dikonfigurasi")
	}

	var body io.Reader
	if payload != nil {
		raw, err := json.Marshal(payload)
		if err != nil {
			return fmt.Errorf("gagal encode payload email: %w", err)
		}
		body = bytes.NewReader(raw)
	}

	fullURL := resendBaseURL + path
	if len(query) > 0 {
		fullURL += "?" + query.Encode()
	}

	req, err := http.NewRequestWithContext(ctx, method, fullURL, body)
	if err != nil {
		return fmt.Errorf("gagal membuat request resend: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+r.apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := r.client.Do(req)
	if err != nil {
		return fmt.Errorf("gagal terhubung ke resend: %w", err)
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= http.StatusBadRequest {
		var apiErr resendErrorEnvelope
		if err := json.Unmarshal(bodyBytes, &apiErr); err == nil && strings.TrimSpace(apiErr.Message) != "" {
			return fmt.Errorf("resend error: %s", apiErr.Message)
		}
		return fmt.Errorf("resend error: status %d", resp.StatusCode)
	}
	if target == nil || len(bodyBytes) == 0 {
		return nil
	}
	if err := json.Unmarshal(bodyBytes, target); err != nil {
		return fmt.Errorf("gagal decode response resend: %w", err)
	}
	return nil
}

func buildListQuery(limit int) url.Values {
	query := url.Values{}
	if limit > 0 {
		query.Set("limit", fmt.Sprintf("%d", limit))
	}
	return query
}

func getHTTPClient() *http.Client {
	httpClientOnce.Do(func() {
		sharedClient = &http.Client{
			Timeout: 20 * time.Second,
			Transport: &http.Transport{
				MaxIdleConns:        32,
				MaxIdleConnsPerHost: 16,
				IdleConnTimeout:     90 * time.Second,
			},
		}
	})
	return sharedClient
}
