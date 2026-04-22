package fonnte

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"strings"
	"time"
)

const (
	apiKey  = "ysYJ1Z8fuEveo6qJsSwZ"
	baseURL = "https://api.fonnte.com"
)

type CommonResponse struct {
	Status bool   `json:"status"`
	Reason string `json:"reason"`
	Detail string `json:"detail"`
}

type ValidateResponse struct {
	Status     bool     `json:"status"`
	Registered []string `json:"registered"`
	Reason     string   `json:"reason"`
}

func SendMessage(target, message string) (bool, error) {
	apiUrl := fmt.Sprintf("%s/send", baseURL)

	cleanTarget := strings.ReplaceAll(target, " ", "")
	cleanTarget = strings.ReplaceAll(cleanTarget, "-", "")
	if strings.HasPrefix(cleanTarget, "0") {
		cleanTarget = "62" + cleanTarget[1:]
	}

	logWA("send.start", map[string]any{
		"target":      cleanTarget,
		"message_len": len(message),
		"api_url":     apiUrl,
	})

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	_ = writer.WriteField("target", cleanTarget)
	_ = writer.WriteField("message", message)
	_ = writer.WriteField("countryCode", "62")
	_ = writer.Close()

	req, _ := http.NewRequest("POST", apiUrl, body)
	req.Header.Set("Authorization", apiKey)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		logWA("send.error", map[string]any{
			"target": cleanTarget,
			"error":  err.Error(),
		})
		return false, fmt.Errorf("fonnte: connection error: %w", err)
	}
	defer resp.Body.Close()

	var result CommonResponse
	bodyBytes, _ := io.ReadAll(resp.Body)
	if err := json.Unmarshal(bodyBytes, &result); err != nil {
		logWA("send.decode_error", map[string]any{
			"target":      cleanTarget,
			"status_code": resp.StatusCode,
			"body":        string(bodyBytes),
			"error":       err.Error(),
		})
		return false, fmt.Errorf("fonnte: failed to decode response: %w", err)
	}

	if !result.Status {
		logWA("send.failed", map[string]any{
			"target":      cleanTarget,
			"status_code": resp.StatusCode,
			"reason":      result.Reason,
			"detail":      result.Detail,
			"body":        string(bodyBytes),
		})
		return false, fmt.Errorf("fonnte error: %s", result.Reason)
	}

	logWA("send.success", map[string]any{
		"target":      cleanTarget,
		"status_code": resp.StatusCode,
	})
	return true, nil
}

func ValidateNumber(target string) (bool, error) {
	apiUrl := fmt.Sprintf("%s/validate", baseURL)

	cleanTarget := strings.ReplaceAll(target, " ", "")
	cleanTarget = strings.ReplaceAll(cleanTarget, "-", "")

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	_ = writer.WriteField("target", cleanTarget)
	_ = writer.WriteField("countryCode", "62")
	_ = writer.Close()

	req, _ := http.NewRequest("POST", apiUrl, body)
	req.Header.Set("Authorization", apiKey)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()

	var result ValidateResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return false, err
	}

	logWA("validate", map[string]any{
		"target":     cleanTarget,
		"status":     result.Status,
		"registered": result.Registered,
	})

	if result.Status && len(result.Registered) > 0 {
		return true, nil
	}

	return false, nil
}

func logWA(event string, fields map[string]any) {
	if strings.ToLower(strings.TrimSpace(os.Getenv("GIN_MODE"))) == "release" {
		return
	}
	fmt.Printf("[FONNTE %s] %v\n", strings.ToUpper(event), fields)
}
