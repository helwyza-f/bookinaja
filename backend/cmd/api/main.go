package main

import (
	"database/sql"
	"log"
	"os"
	"time"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/jmoiron/sqlx"

	// Import semua domain internal
	"github.com/helwiza/backend/internal/auth"
	"github.com/helwiza/backend/internal/billing"
	"github.com/helwiza/backend/internal/customer"
	"github.com/helwiza/backend/internal/expense"
	"github.com/helwiza/backend/internal/fnb"
	"github.com/helwiza/backend/internal/platformadmin"
	"github.com/helwiza/backend/internal/reservation"
	"github.com/helwiza/backend/internal/resource"
	"github.com/helwiza/backend/internal/tenant"

	// Platform & Infrastructure
	"github.com/helwiza/backend/internal/platform/database"
	"github.com/helwiza/backend/internal/platform/http"
	"github.com/helwiza/backend/internal/platform/http/routecfg"
	midtranssvc "github.com/helwiza/backend/internal/platform/midtrans"
	"github.com/joho/godotenv"
)

func main() {
	// 0. Load Configuration (.env)
	if err := godotenv.Load(); err != nil {
		log.Println("ℹ️ Info: .env file not found, menggunakan environment variables sistem")
	}

	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")

	// 1. Database Connection with Retry Logic
	var db *sqlx.DB
	var err error
	for i := 0; i < 5; i++ {
		db, err = database.NewPostgres(
			dbHost,
			dbPort,
			os.Getenv("DB_USER"),
			os.Getenv("DB_PASSWORD"),
			os.Getenv("DB_NAME"),
		)
		if err == nil {
			break
		}
		log.Printf("⏳ DB belum siap di %s:%s, mencoba ulang dalam 2 detik... (%d/5)", dbHost, dbPort, i+1)
		time.Sleep(2 * time.Second)
	}
	if err != nil {
		log.Fatalf("❌ DB Connection Error: %v", err)
	}
	defer db.Close()

	// 2. Redis Connection
	rdb, err := database.NewRedisClient()
	if err != nil {
		log.Fatalf("❌ Redis Connection Error: %v", err)
	}
	defer rdb.Close()

	// 3. Database Migration
	runMigration(db.DB)

	// 4. DEPENDENCY INJECTION (Wiring Batam Engine)
	// STEP A: Inisialisasi Semua Repository
	tenantRepo := tenant.NewRepository(db, rdb)
	customerRepo := customer.NewRepository(db)
	expenseRepo := expense.NewRepository(db)
	resourceRepo := resource.NewRepository(db, rdb)
	reservationRepo := reservation.NewRepository(db)
	fnbRepo := fnb.NewRepository(db)
	billingRepo := billing.NewRepository(db)
	platformRepo := platformadmin.NewRepository(db)
	midtransRepo := midtranssvc.NewRepository(db)

	// STEP B: Inisialisasi Semua Service (Urutan Berpengaruh)
	// AuthSvc berdiri sendiri
	authSvc := auth.NewService()

	// TenantSvc butuh AuthSvc
	tenantSvc := tenant.NewService(tenantRepo, authSvc)

	// Domain lainnya
	customerSvc := customer.NewService(customerRepo, rdb)
	expenseSvc := expense.NewService(expenseRepo)
	resourceSvc := resource.NewService(resourceRepo)
	fnbSvc := fnb.NewService(fnbRepo)
	reservationSvc := reservation.NewService(reservationRepo, resourceRepo, customerSvc, fnbSvc)
	scheduler := reservation.NewScheduler(db, reservationRepo)
	billingSvc := billing.NewService(db, billingRepo)
	platformSvc := platformadmin.NewService()

	// STEP C: Inisialisasi Semua Handler
	// Sekarang tenantSvc sudah terdefinisi, aman buat authHdl
	authHdl := auth.NewHandler(authSvc, tenantSvc)
	customerHdl := customer.NewHandler(customerSvc)
	expenseHdl := expense.NewHandler(expenseSvc)
	tenantHdl := tenant.NewHandler(tenantSvc)
	resourceHdl := resource.NewHandler(resourceSvc)
	reservationHdl := reservation.NewHandler(reservationSvc)
	fnbHdl := fnb.NewHandler(fnbSvc)
	billingHdl := billing.NewHandler(billingSvc)
	platformHdl := platformadmin.NewHandler(platformSvc, platformRepo)
	midtransSvc := midtranssvc.NewService(db, midtransRepo)
	midtransHdl := midtranssvc.NewHandler(midtransSvc)

	// 5. Setup Router Config
	routerConfig := routecfg.Config{
		TenantHandler:      tenantHdl,
		ResourceHandler:    resourceHdl,
		ReservationHandler: reservationHdl,
		CustomerHandler:    customerHdl,
		AuthHandler:        authHdl,
		FnbHandler:         fnbHdl,
		ExpenseHandler:     expenseHdl,
		BillingHandler:     billingHdl,
		PlatformHandler:    platformHdl,
		MidtransHandler:    midtransHdl,
	}

	r := http.NewRouter(routerConfig, db, rdb)

	scheduler.Start()

	// 6. Start Server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Println("--------------------------------------------------")
	log.Printf("🚀 BOOKINAJA ENGINE: LIVE ON IDCLOUDHOST")
	log.Printf("📡 Environment : %s", os.Getenv("APP_ENV"))
	log.Printf("📡 Domain      : %s", os.Getenv("APP_DOMAIN"))
	log.Printf("📡 Port        : %s", port)
	log.Printf("📦 Storage     : Cloudflare R2 (cdn.bookinaja.com)")
	log.Printf("⚡ Cache Engine : Redis (7-alpine)")
	log.Println("--------------------------------------------------")

	if err := r.Run(":" + port); err != nil {
		log.Fatalf("❌ Gagal menjalankan server: %v", err)
	}
}

func runMigration(db *sql.DB) {
	driver, err := postgres.WithInstance(db, &postgres.Config{})
	if err != nil {
		log.Fatalf("❌ Migration driver error: %v", err)
	}

	mPath := os.Getenv("MIGRATION_PATH")
	if mPath == "" {
		mPath = "file://migrations"
	}

	m, err := migrate.NewWithDatabaseInstance(
		mPath,
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
