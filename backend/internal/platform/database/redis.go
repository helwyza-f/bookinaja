package database

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/redis/go-redis/v9"
)

// NewRedisClient menginisialisasi koneksi ke Redis di ekosistem Docker IDCloudHost
func NewRedisClient() (*redis.Client, error) {
	// 1. Ambil Alamat Redis (Pastikan di env isinya 'redis:6379')
	addr := os.Getenv("REDIS_ADDR")
	if addr == "" {
		addr = "redis:6379" // Default fallback untuk internal docker network
	}
	password := os.Getenv("REDIS_PASSWORD")

	// 2. Konfigurasi Client dengan Pooling yang dioptimasi untuk VPS 2GB
	rdb := redis.NewClient(&redis.Options{
		Addr:	  addr,
		Password: password,
		DB:		  0, // Default DB
		
		// Optimasi Pool agar tidak memakan RAM berlebih
		PoolSize:		10,				  // Maksimal koneksi idle
		MinIdleConns:	5,				   // Minimal koneksi standby
		DialTimeout:	5 * time.Second,   // Timeout saat mencoba konek
		ReadTimeout:	3 * time.Second,   // Timeout saat baca data
		WriteTimeout:	3 * time.Second,   // Timeout saat tulis data
		PoolTimeout:	4 * time.Second,   // Timeout nunggu koneksi dari pool
	})

	// 3. Test Koneksi (Ping) dengan Retry Logic
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var err error
	for i := 0; i < 3; i++ {
		_, err = rdb.Ping(ctx).Result()
		if err == nil {
			break
		}
		log.Printf("⏳ Redis not ready, retrying... (%d/3)", i+1)
		time.Sleep(2 * time.Second)
	}

	if err != nil {
		return nil, fmt.Errorf("❌ Redis connection failed: %w", err)
	}

	fmt.Println("Successfully connected to Local Redis Engine! 🚀")
	return rdb, nil
}