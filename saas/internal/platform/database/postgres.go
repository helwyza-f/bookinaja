package database

import (
	"fmt"
	"os" // Tambahkan import os

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

func NewPostgres(host, port, user, password, dbname string) (*sqlx.DB, error) {
	// Ambil sslmode dari env, jika kosong default ke require (aman untuk RDS)
	sslMode := os.Getenv("DB_SSLMODE")
	if sslMode == "" {
		sslMode = "require"
	}

	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		host, port, user, password, dbname, sslMode)

	db, err := sqlx.Open("postgres", dsn)
	if err != nil {
		return nil, err
	}

	if err := db.Ping(); err != nil {
		return nil, err
	}

	return db, nil
}