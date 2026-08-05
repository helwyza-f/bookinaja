package reservation

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"
)

// packageTimeLock adalah konfigurasi opsional per paket harga (resource_item)
// yang membatasi paket hanya bisa dipesan pada rentang jam tertentu.
//
// Disimpan di resource_items.metadata dengan bentuk:
//
//	{ "time_lock": { "enabled": true, "from": "08:00", "to": "17:00" } }
//
// Default (tidak ada metadata / enabled=false / config invalid) berarti
// paket tersedia di semua jam — perilaku lama tetap dipertahankan.
type packageTimeLock struct {
	Enabled bool   `json:"enabled"`
	From    string `json:"from"`
	To      string `json:"to"`
}

// validatePackageTimeWindow memastikan booking [localStart, localEnd] (waktu
// lokal tenant) berada di dalam rentang jam paket, JIKA paket dikunci.
// Mengembalikan nil kalau paket tidak dikunci atau config-nya tidak valid,
// supaya penguncian bersifat opt-in dan tidak pernah memblokir secara diam-diam
// karena metadata yang rusak.
func validatePackageTimeWindow(meta *json.RawMessage, localStart, localEnd time.Time) error {
	if meta == nil || len(*meta) == 0 {
		return nil
	}

	var wrapper struct {
		TimeLock *packageTimeLock `json:"time_lock"`
	}
	if err := json.Unmarshal(*meta, &wrapper); err != nil {
		return nil // metadata rusak tidak boleh memblokir booking
	}

	lock := wrapper.TimeLock
	if lock == nil || !lock.Enabled {
		return nil // tidak dikunci → tersedia semua jam
	}

	fromMin, okFrom := parseClockMinutes(lock.From)
	toMin, okTo := parseClockMinutes(lock.To)
	if !okFrom || !okTo || fromMin >= toMin {
		return nil // config invalid → jangan blokir
	}

	startMin := localStart.Hour()*60 + localStart.Minute()
	endMin := localEnd.Hour()*60 + localEnd.Minute()
	// Booking yang berakhir tepat tengah malam dihitung sebagai akhir hari (24:00).
	if endMin == 0 && localEnd.After(localStart) {
		endMin = 24 * 60
	}

	if startMin < fromMin || endMin > toMin {
		return fmt.Errorf("PAKET INI HANYA BISA DIPESAN JAM %s–%s", lock.From, lock.To)
	}
	return nil
}

// parseClockMinutes mengubah "HH:MM" menjadi menit-dalam-hari. Mendukung
// "24:00" sebagai akhir hari (1440).
func parseClockMinutes(raw string) (int, bool) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return 0, false
	}
	if raw == "24:00" {
		return 24 * 60, true
	}
	parts := strings.Split(raw, ":")
	if len(parts) != 2 {
		return 0, false
	}
	hour, errH := strconv.Atoi(strings.TrimSpace(parts[0]))
	minute, errM := strconv.Atoi(strings.TrimSpace(parts[1]))
	if errH != nil || errM != nil {
		return 0, false
	}
	if hour < 0 || hour > 24 || minute < 0 || minute > 59 {
		return 0, false
	}
	return hour*60 + minute, true
}
