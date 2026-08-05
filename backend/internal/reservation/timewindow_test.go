package reservation

import (
	"encoding/json"
	"testing"
	"time"
)

func rawMeta(s string) *json.RawMessage {
	m := json.RawMessage(s)
	return &m
}

func atClock(hour, minute int) time.Time {
	return time.Date(2026, 8, 5, hour, minute, 0, 0, time.UTC)
}

func TestValidatePackageTimeWindow(t *testing.T) {
	cases := []struct {
		name    string
		meta    *json.RawMessage
		start   time.Time
		end     time.Time
		wantErr bool
	}{
		{
			name:    "nil metadata tersedia semua jam",
			meta:    nil,
			start:   atClock(20, 0),
			end:     atClock(22, 0),
			wantErr: false,
		},
		{
			name:    "metadata kosong tersedia semua jam",
			meta:    rawMeta(`{}`),
			start:   atClock(20, 0),
			end:     atClock(22, 0),
			wantErr: false,
		},
		{
			name:    "time_lock disabled tersedia semua jam",
			meta:    rawMeta(`{"time_lock":{"enabled":false,"from":"08:00","to":"17:00"}}`),
			start:   atClock(20, 0),
			end:     atClock(22, 0),
			wantErr: false,
		},
		{
			name:    "paket siang dipakai malam ditolak",
			meta:    rawMeta(`{"time_lock":{"enabled":true,"from":"08:00","to":"17:00"}}`),
			start:   atClock(20, 0),
			end:     atClock(22, 0),
			wantErr: true,
		},
		{
			name:    "paket siang dipakai siang diterima",
			meta:    rawMeta(`{"time_lock":{"enabled":true,"from":"08:00","to":"17:00"}}`),
			start:   atClock(10, 0),
			end:     atClock(12, 0),
			wantErr: false,
		},
		{
			name:    "paket siang tepat di batas atas diterima",
			meta:    rawMeta(`{"time_lock":{"enabled":true,"from":"08:00","to":"17:00"}}`),
			start:   atClock(15, 0),
			end:     atClock(17, 0),
			wantErr: false,
		},
		{
			name:    "paket siang melewati batas atas ditolak",
			meta:    rawMeta(`{"time_lock":{"enabled":true,"from":"08:00","to":"17:00"}}`),
			start:   atClock(16, 0),
			end:     atClock(18, 0),
			wantErr: true,
		},
		{
			name:    "paket malam sampai tengah malam diterima",
			meta:    rawMeta(`{"time_lock":{"enabled":true,"from":"17:00","to":"24:00"}}`),
			start:   atClock(22, 0),
			end:     atClock(0, 0).Add(24 * time.Hour), // 00:00 hari berikutnya
			wantErr: false,
		},
		{
			name:    "config invalid (from >= to) tidak memblokir",
			meta:    rawMeta(`{"time_lock":{"enabled":true,"from":"17:00","to":"08:00"}}`),
			start:   atClock(20, 0),
			end:     atClock(22, 0),
			wantErr: false,
		},
		{
			name:    "metadata rusak tidak memblokir",
			meta:    rawMeta(`{not-json`),
			start:   atClock(20, 0),
			end:     atClock(22, 0),
			wantErr: false,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := validatePackageTimeWindow(tc.meta, tc.start, tc.end)
			if (err != nil) != tc.wantErr {
				t.Fatalf("validatePackageTimeWindow() error = %v, wantErr = %v", err, tc.wantErr)
			}
		})
	}
}

func TestParseClockMinutes(t *testing.T) {
	cases := []struct {
		in   string
		want int
		ok   bool
	}{
		{"08:00", 480, true},
		{"17:30", 1050, true},
		{"24:00", 1440, true},
		{"00:00", 0, true},
		{" 9:05 ", 545, true},
		{"25:00", 0, false},
		{"08:70", 0, false},
		{"abc", 0, false},
		{"", 0, false},
		{"0800", 0, false},
	}
	for _, tc := range cases {
		got, ok := parseClockMinutes(tc.in)
		if ok != tc.ok || (ok && got != tc.want) {
			t.Fatalf("parseClockMinutes(%q) = (%d, %v), want (%d, %v)", tc.in, got, ok, tc.want, tc.ok)
		}
	}
}
