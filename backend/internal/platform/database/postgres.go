package database

import (
	"fmt"
	"os"
	"time"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

// NewPostgres menginisialisasi koneksi ke database PostgreSQL
func NewPostgres(host, port, user, password, dbname string) (*sqlx.DB, error) {
	// 1. Ambil SSL Mode dari env, default ke 'disable'
	// Cocok untuk Docker internal network di IDCloudHost
	sslMode := os.Getenv("DB_SSLMODE")
	if sslMode == "" {
		sslMode = "disable"
	}

	// 2. Default Port jika kosong (Safety fallback)
	if port == "" {
		port = "5432"
	}

	// 3. Susun Data Source Name (DSN)
	// Pastikan format dsn benar menggunakan sslmode yang dinamis
	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		host, port, user, password, dbname, sslMode)

	// 4. Open koneksi menggunakan sqlx
	db, err := sqlx.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("gagal membuka koneksi ke postgres: %w", err)
	}

	// 5. Verifikasi koneksi (Ping)
	// Kita batasi waktu ping agar tidak gantung (hang) terlalu lama
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("database tidak merespon pada %s:%s: %w", host, port, err)
	}

	// 6. Connection Pool Optimization
	// Sangat krusial untuk VPS RAM 2GB agar tidak kehabisan file descriptor
	db.SetMaxOpenConns(25)                 // Maksimal koneksi aktif
	db.SetMaxIdleConns(10)                 // Koneksi idle yang disimpan di pool
	db.SetConnMaxLifetime(5 * time.Minute) // Restart koneksi tiap 5 menit untuk cegah stale connections
	db.SetConnMaxIdleTime(2 * time.Minute) // Tutup koneksi idle jika tidak dipakai selama 2 menit

	return db, nil
}