package tenant

import (
	"encoding/json"
	"strings"
)

// Mode Aplikasi kanonik — menentukan apakah workspace menjalankan booking,
// kasir, atau keduanya. Disimpan di `booking_form_config` (key `app_mode` +
// flag pos_*). Lihat AdminBootstrapFeatures & GetTenantAppMode.
const (
	AppModeBookingPos  = "booking_pos"  // booking + kasir
	AppModeBookingOnly = "booking_only" // reservasi murni
	AppModePosOnly     = "pos_only"     // kasir saja, booking hilang
)

// NormalizeAppMode memetakan input bebas ke salah satu mode kanonik. Default
// (kosong/tak dikenal) = booking_pos, sejalan dengan default bootstrap admin.
func NormalizeAppMode(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case AppModeBookingOnly:
		return AppModeBookingOnly
	case AppModePosOnly:
		return AppModePosOnly
	default:
		return AppModeBookingPos
	}
}

// appModeConfig adalah bentuk penuh konfigurasi mode yang ditulis ke
// booking_form_config saat workspace dibuat.
type appModeConfig struct {
	AppMode           string `json:"app_mode"`
	PosStandalone     bool   `json:"pos_standalone"`
	PosOnSession      bool   `json:"pos_on_session"`
	PosAddonOnSession bool   `json:"pos_addon_on_session"`
	FnbMode           string `json:"fnb_mode"` // legacy, untuk klien lama
}

// appModeConfigFor menurunkan flag pos_* + fnb_mode legacy dari mode kanonik.
func appModeConfigFor(mode string) appModeConfig {
	switch NormalizeAppMode(mode) {
	case AppModeBookingOnly:
		return appModeConfig{AppMode: AppModeBookingOnly, PosStandalone: false, PosOnSession: false, PosAddonOnSession: false, FnbMode: "off"}
	case AppModePosOnly:
		return appModeConfig{AppMode: AppModePosOnly, PosStandalone: true, PosOnSession: false, PosAddonOnSession: false, FnbMode: "standalone"}
	default:
		return appModeConfig{AppMode: AppModeBookingPos, PosStandalone: true, PosOnSession: true, PosAddonOnSession: true, FnbMode: "integrated"}
	}
}

// AppModeConfigJSON mengembalikan JSON booking_form_config awal untuk mode
// tertentu, dipakai saat membuat tenant/workspace baru. Tak pernah error untuk
// input apa pun (fallback ke booking_pos).
func AppModeConfigJSON(mode string) []byte {
	b, err := json.Marshal(appModeConfigFor(mode))
	if err != nil {
		// appModeConfig statik → praktis tak mungkin gagal; fallback aman.
		return []byte(`{"app_mode":"booking_pos","pos_standalone":true,"pos_on_session":true,"pos_addon_on_session":true,"fnb_mode":"integrated"}`)
	}
	return b
}
