package paymentgateway

import (
	"time"

	"github.com/google/uuid"
)

const (
	ProviderMidtrans = "midtrans"
	ProviderXendit   = "xendit"

	EnvSandbox    = "sandbox"
	EnvProduction = "production"

	StatusUnverified = "unverified"
	StatusVerified   = "verified"
	StatusDisabled   = "disabled"
)

// Credential adalah kredensial gateway tenant yang SUDAH terdekripsi (dipakai
// hanya di memori server saat membuat charge / memverifikasi webhook).
// JANGAN pernah diserialisasi ke response.
type Credential struct {
	TenantID       uuid.UUID
	Provider       string
	Environment    string
	ServerKey      string
	ClientKey      string
	CallbackSecret string
	Status         string
}

func (c Credential) IsProduction() bool { return c.Environment == EnvProduction }

// Usable = siap dipakai untuk menagih (sudah terverifikasi & ada server key).
func (c Credential) Usable() bool {
	return c != (Credential{}) && c.Status == StatusVerified && c.ServerKey != ""
}

// PublicConfig aman dikirim ke frontend (tanpa server key). client_key Midtrans
// memang publik (dipakai Snap di browser); Xendit tidak butuh client key.
type PublicConfig struct {
	Provider    string `json:"provider"`
	Environment string `json:"environment"`
	ClientKey   string `json:"client_key"`
	Configured  bool   `json:"configured"`
}

// AdminView untuk owner tenant: secret di-mask, tidak pernah mengembalikan
// server key mentah.
type AdminView struct {
	Provider          string     `json:"provider"`
	Environment       string     `json:"environment"`
	ClientKey         string     `json:"client_key"`
	ServerKeyMasked   string     `json:"server_key_masked"`
	ServerKeySet      bool       `json:"server_key_set"`
	CallbackSecretSet bool       `json:"callback_secret_set"`
	Status            string     `json:"status"`
	LastError         string     `json:"last_error,omitempty"`
	VerifiedAt        *time.Time `json:"verified_at,omitempty"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

func maskSecret(s string) string {
	s = trimForMask(s)
	if s == "" {
		return ""
	}
	if len(s) <= 4 {
		return "••••"
	}
	return "••••" + s[len(s)-4:]
}

func trimForMask(s string) string {
	// hanya untuk tampilan; hindari import strings ganda.
	for len(s) > 0 && (s[0] == ' ' || s[0] == '\t' || s[0] == '\n') {
		s = s[1:]
	}
	for len(s) > 0 && (s[len(s)-1] == ' ' || s[len(s)-1] == '\t' || s[len(s)-1] == '\n') {
		s = s[:len(s)-1]
	}
	return s
}
