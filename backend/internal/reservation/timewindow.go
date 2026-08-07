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

// packageDayLock adalah konfigurasi opsional per paket harga (resource_item)
// yang membatasi paket hanya bisa dipesan pada hari tertentu. Berguna untuk
// membedakan paket weekday vs weekend tanpa promo.
//
// Disimpan di resource_items.metadata dengan bentuk:
//
//	{ "day_lock": { "enabled": true, "days": [1,2,3,4,5] } }
//
// days memakai penomoran ISO: 1=Senin ... 7=Minggu (konsisten dengan promo).
// Default (tidak ada metadata / enabled=false / days kosong) berarti paket
// tersedia di semua hari — perilaku lama tetap dipertahankan.
type packageDayLock struct {
	Enabled bool  `json:"enabled"`
	Days    []int `json:"days"`
}

var indoWeekdayNames = map[int]string{
	1: "Senin", 2: "Selasa", 3: "Rabu", 4: "Kamis",
	5: "Jumat", 6: "Sabtu", 7: "Minggu",
}

// isoWeekday mengubah time.Weekday (Minggu=0) menjadi penomoran ISO
// (Senin=1 ... Minggu=7).
func isoWeekday(t time.Time) int {
	wd := int(t.Weekday())
	if wd == 0 {
		return 7
	}
	return wd
}

// validatePackageDayWindow memastikan hari mulai booking (waktu lokal tenant)
// termasuk dalam hari yang diizinkan paket, JIKA paket dikunci per hari.
// Mengembalikan nil kalau paket tidak dikunci atau config-nya tidak valid,
// supaya penguncian bersifat opt-in dan tidak pernah memblokir secara diam-diam
// karena metadata yang rusak.
func validatePackageDayWindow(meta *json.RawMessage, localStart time.Time) error {
	if meta == nil || len(*meta) == 0 {
		return nil
	}

	var wrapper struct {
		DayLock *packageDayLock `json:"day_lock"`
	}
	if err := json.Unmarshal(*meta, &wrapper); err != nil {
		return nil // metadata rusak tidak boleh memblokir booking
	}

	lock := wrapper.DayLock
	if lock == nil || !lock.Enabled || len(lock.Days) == 0 {
		return nil // tidak dikunci → tersedia semua hari
	}

	wd := isoWeekday(localStart)
	for _, d := range lock.Days {
		if d == wd {
			return nil
		}
	}

	allowed := make([]string, 0, len(lock.Days))
	for _, d := range lock.Days {
		if name, ok := indoWeekdayNames[d]; ok {
			allowed = append(allowed, name)
		}
	}
	return fmt.Errorf("PAKET INI HANYA BISA DIPESAN HARI %s", strings.Join(allowed, ", "))
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
