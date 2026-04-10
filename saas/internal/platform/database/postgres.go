package database

import (
	"fmt"
	"os"
	"time"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

// NewPostgres menginisialisasi koneksi ke database PostgreSQL di IDCloudHost
func NewPostgres(host, port, user, password, dbname string) (*sqlx.DB, error) {
	// 1. Ambil SSL Mode dari env, default ke 'disable' untuk koneksi internal Docker
	sslMode := os.Getenv("DB_SSLMODE")
	if sslMode == "" {
		sslMode = "disable"
	}

	// 2. Susun Data Source Name (DSN)
	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		host, port, user, password, dbname, sslMode)

	// 3. Open koneksi menggunakan sqlx
	db, err := sqlx.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("FATAL: gagal membuka koneksi ke postgres: %w", err)
	}

	// 4. Verifikasi koneksi (Ping)
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("FATAL: database tidak merespon (ping gagal): %w", err)
	}

	// 5. Connection Pool Optimization
	// Sangat krusial untuk VPS dengan RAM terbatas agar resource terjaga
	db.SetMaxOpenConns(25)                 // Maksimal koneksi yang terbuka
	db.SetMaxIdleConns(10)                 // Maksimal koneksi idle yang dipertahankan
	db.SetConnMaxLifetime(5 * time.Minute) // Umur maksimal satu koneksi
	db.SetConnMaxIdleTime(2 * time.Minute) // Waktu maksimal koneksi idle sebelum ditutup

	return db, nil
}