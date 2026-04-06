package database

import (
	"context"
	"fmt"
	"os"

	"github.com/redis/go-redis/v9"
)

func NewRedisClient() (*redis.Client, error) {
	// Gunakan variabel environment agar aman (jangan hardcode password di repo)
	addr := os.Getenv("REDIS_ADDR")
	password := os.Getenv("REDIS_PASSWORD")

	rdb := redis.NewClient(&redis.Options{
		Addr:	  addr,
		Password: password, // Kosongkan jika tidak ada password
		DB:		  0,        // Use default DB
	})

	// Test Koneksi (Ping)
	ctx := context.Background()
	_, err := rdb.Ping(ctx).Result()
	if err != nil {
		return nil, fmt.Errorf("redis connection failed: %w", err)
	}

	fmt.Println("Successfully connected to Redis Cloud! 🚀")
	return rdb, nil
}