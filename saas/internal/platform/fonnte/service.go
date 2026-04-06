package fonnte

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"strings"
	"time"
)

// Ganti dengan API Key Fonnte kamu (Atau ambil dari os.Getenv)
const (
	apiKey = "ysYJ1Z8fuEveo6qJsSwZ"
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

// SendMessage mengirim pesan teks ke nomor WhatsApp tujuan
func SendMessage(target, message string) (bool, error) {
	apiUrl := fmt.Sprintf("%s/send", baseURL)

	// 1. Normalisasi nomor ke format 62 (Fonnte lebih suka ini untuk Send)
	cleanTarget := strings.ReplaceAll(target, " ", "")
	cleanTarget = strings.ReplaceAll(cleanTarget, "-", "")
	if strings.HasPrefix(cleanTarget, "0") {
		cleanTarget = "62" + cleanTarget[1:]
	}

	// 2. Build Multipart Body
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	_ = writer.WriteField("target", cleanTarget)
	_ = writer.WriteField("message", message)
	_ = writer.WriteField("countryCode", "62") // Default Indonesia
	_ = writer.Close()

	// 3. Request
	req, _ := http.NewRequest("POST", apiUrl, body)
	req.Header.Set("Authorization", apiKey)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return false, fmt.Errorf("fonnte: connection error: %w", err)
	}
	defer resp.Body.Close()

	// 4. Decode Response
	var result CommonResponse
	bodyBytes, _ := io.ReadAll(resp.Body)
	if err := json.Unmarshal(bodyBytes, &result); err != nil {
		return false, fmt.Errorf("fonnte: failed to decode response: %w", err)
	}

	if !result.Status {
		return false, fmt.Errorf("fonnte error: %s", result.Reason)
	}

	fmt.Printf("[FONNTE SEND] Target: %s | Status: Success 🚀\n", cleanTarget)
	return true, nil
}

// ValidateNumber mengecek apakah nomor HP terdaftar di WhatsApp
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

	fmt.Printf("[FONNTE VALIDATE] Sent: %s | Status: %v | Registered: %v\n", cleanTarget, result.Status, result.Registered)

	if result.Status && len(result.Registered) > 0 {
		return true, nil
	}

	return false, nil
}