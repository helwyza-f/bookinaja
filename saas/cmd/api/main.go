package main

import (
	"database/sql"
	"log"
	"os"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"

	// Import semua domain internal
	"github.com/helwiza/saas/internal/auth"
	"github.com/helwiza/saas/internal/customer"
	"github.com/helwiza/saas/internal/fnb"
	"github.com/helwiza/saas/internal/reservation"
	"github.com/helwiza/saas/internal/resource"
	"github.com/helwiza/saas/internal/tenant"

	// Platform & Infrastructure
	"github.com/helwiza/saas/internal/platform/database"
	"github.com/helwiza/saas/internal/platform/http"
	"github.com/joho/godotenv"
)

func main() {
	// 0. Load Configuration (.env)
	if err := godotenv.Load(); err != nil {
		log.Println("⚠️ Warning: .env file not found, using system environment variables")
	}

	// 1. Database Connection (Postgres via sqlx)
	db, err := database.NewPostgres(
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"),
	)
	if err != nil {
		log.Fatalf("❌ DB Connection Error: %v", err)
	}
	defer db.Close()

	// 2. Redis Connection (Redis Cloud / Local)
	rdb, err := database.NewRedisClient()
	if err != nil {
		log.Fatalf("❌ Redis Connection Error: %v", err)
	}
	defer rdb.Close()

	// 3. Database Migration
	runMigration(db.DB)

	// 4. Dependency Injection (Wiring/Kabel Modul)
	
	// --- AUTH DOMAIN ---
	authSvc := auth.NewService()
	authHdl := auth.NewHandler(authSvc)

	// --- CUSTOMER DOMAIN ---
	customerRepo := customer.NewRepository(db)
	customerSvc := customer.NewService(customerRepo, rdb)
	customerHdl := customer.NewHandler(customerSvc)

	// --- TENANT DOMAIN ---
	// UPDATE: Tenant Repository sekarang butuh rdb untuk Caching Landing Page
	tenantRepo := tenant.NewRepository(db, rdb) 
	tenantSvc := tenant.NewService(tenantRepo, authSvc)
	tenantHdl := tenant.NewHandler(tenantSvc)

	// --- RESOURCE DOMAIN ---
	resourceRepo := resource.NewRepository(db)
	resourceSvc := resource.NewService(resourceRepo)
	resourceHdl := resource.NewHandler(resourceSvc)

	// --- RESERVATION DOMAIN ---
	reservationRepo := reservation.NewRepository(db)
	reservationSvc := reservation.NewService(reservationRepo, resourceRepo, customerSvc)
	reservationHdl := reservation.NewHandler(reservationSvc)

	// --- F&B DOMAIN ---
	fnbRepo := fnb.NewRepository(db)
	fnbSvc := fnb.NewService(fnbRepo)
	fnbHdl := fnb.NewHandler(fnbSvc)

	// 5. Setup Router dengan Config Lengkap
	routerConfig := http.Config{
		TenantHandler:      tenantHdl,
		ResourceHandler:    resourceHdl,
		ReservationHandler: reservationHdl,
		CustomerHandler:    customerHdl,
		AuthHandler:        authHdl,
		FnbHandler:         fnbHdl,
	}

	// Oper db dan rdb ke Router untuk keperluan middleware TenantIdentifier & CORS
	r := http.NewRouter(routerConfig, db, rdb)

	// 6. Start Server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🚀 BATAM ENGINE STARTED")
	log.Printf("📡 Listening on port :%s", port)
	log.Printf("🧠 Redis Cache & OTP: ENABLED")
	
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("❌ Failed to run server: %v", err)
	}
}

// runMigration menjalankan script SQL secara otomatis dari folder /migrations
func runMigration(db *sql.DB) {
	driver, err := postgres.WithInstance(db, &postgres.Config{})
	if err != nil {
		log.Fatalf("❌ Migration driver error: %v", err)
	}

	m, err := migrate.NewWithDatabaseInstance(
		"file://migrations",
		"postgres", driver,
	)
	if err != nil {
		log.Fatalf("❌ Migration init error: %v", err)
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		log.Fatalf("❌ Migration failed: %v", err)
	}

	log.Println("✅ Database schema is up to date.")
}