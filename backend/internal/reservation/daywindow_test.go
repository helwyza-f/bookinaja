package reservation

import (
	"encoding/json"
	"testing"
	"time"
)

// onDate mengembalikan waktu pada tanggal tertentu (2026-08-DD) jam 10:00 UTC.
// 2026-08-03 = Senin ... 2026-08-09 = Minggu.
func onDate(day int) time.Time {
	return time.Date(2026, 8, day, 10, 0, 0, 0, time.UTC)
}

func TestValidatePackageDayWindow(t *testing.T) {
	cases := []struct {
		name    string
		meta    *json.RawMessage
		start   time.Time
		wantErr bool
	}{
		{
			name:    "nil metadata tersedia semua hari",
			meta:    nil,
			start:   onDate(8), // Sabtu
			wantErr: false,
		},
		{
			name:    "day_lock disabled tersedia semua hari",
			meta:    rawMeta(`{"day_lock":{"enabled":false,"days":[6,7]}}`),
			start:   onDate(3), // Senin
			wantErr: false,
		},
		{
			name:    "days kosong tidak memblokir",
			meta:    rawMeta(`{"day_lock":{"enabled":true,"days":[]}}`),
			start:   onDate(3),
			wantErr: false,
		},
		{
			name:    "weekend-only, booking Sabtu diizinkan",
			meta:    rawMeta(`{"day_lock":{"enabled":true,"days":[6,7]}}`),
			start:   onDate(8), // Sabtu
			wantErr: false,
		},
		{
			name:    "weekend-only, booking Minggu diizinkan",
			meta:    rawMeta(`{"day_lock":{"enabled":true,"days":[6,7]}}`),
			start:   onDate(9), // Minggu
			wantErr: false,
		},
		{
			name:    "weekend-only, booking Rabu ditolak",
			meta:    rawMeta(`{"day_lock":{"enabled":true,"days":[6,7]}}`),
			start:   onDate(5), // Rabu
			wantErr: true,
		},
		{
			name:    "weekday-only, booking Sabtu ditolak",
			meta:    rawMeta(`{"day_lock":{"enabled":true,"days":[1,2,3,4,5]}}`),
			start:   onDate(8), // Sabtu
			wantErr: true,
		},
		{
			name:    "metadata rusak tidak memblokir",
			meta:    rawMeta(`{invalid`),
			start:   onDate(5),
			wantErr: false,
		},
		{
			name:    "berdampingan dengan time_lock tetap cek hari",
			meta:    rawMeta(`{"time_lock":{"enabled":true,"from":"08:00","to":"17:00"},"day_lock":{"enabled":true,"days":[6,7]}}`),
			start:   onDate(5), // Rabu
			wantErr: true,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := validatePackageDayWindow(tc.meta, tc.start)
			if tc.wantErr && err == nil {
				t.Fatalf("expected error, got nil")
			}
			if !tc.wantErr && err != nil {
				t.Fatalf("expected no error, got %v", err)
			}
		})
	}
}

func TestIsoWeekday(t *testing.T) {
	// 2026-08-03 Senin ... 2026-08-09 Minggu
	want := map[int]int{3: 1, 4: 2, 5: 3, 6: 4, 7: 5, 8: 6, 9: 7}
	for day, iso := range want {
		if got := isoWeekday(onDate(day)); got != iso {
			t.Errorf("onDate(%d): got iso %d, want %d", day, got, iso)
		}
	}
}
