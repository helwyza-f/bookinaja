package main

import (
	"database/sql"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/jmoiron/sqlx"

	"github.com/helwiza/backend/internal/auth"
	"github.com/helwiza/backend/internal/billing"
	"github.com/helwiza/backend/internal/customer"
	"github.com/helwiza/backend/internal/expense"
	"github.com/helwiza/backend/internal/fnb"
	"github.com/helwiza/backend/internal/platform/database"
	"github.com/helwiza/backend/internal/platform/http"
	"github.com/helwiza/backend/internal/platform/http/routecfg"
	midtranssvc "github.com/helwiza/backend/internal/platform/midtrans"
	"github.com/helwiza/backend/internal/platformadmin"
	"github.com/helwiza/backend/internal/reservation"
	"github.com/helwiza/backend/internal/resource"
	"github.com/helwiza/backend/internal/tenant"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("info: .env file not found, using system environment variables")
	}

	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")

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
		log.Printf("database not ready at %s:%s, retrying in 2s (%d/5)", dbHost, dbPort, i+1)
		time.Sleep(2 * time.Second)
	}
	if err != nil {
		log.Fatalf("database connection error: %v", err)
	}
	defer db.Close()

	rdb, err := database.NewRedisClient()
	if err != nil {
		log.Fatalf("redis connection error: %v", err)
	}
	defer rdb.Close()

	runMigration(db.DB)

	tenantRepo := tenant.NewRepository(db, rdb)
	customerRepo := customer.NewRepository(db)
	expenseRepo := expense.NewRepository(db)
	resourceRepo := resource.NewRepository(db, rdb)
	reservationRepo := reservation.NewRepository(db)
	fnbRepo := fnb.NewRepository(db)
	billingRepo := billing.NewRepository(db)
	platformRepo := platformadmin.NewRepository(db)
	midtransRepo := midtranssvc.NewRepository(db)

	authSvc := auth.NewService()
	tenantSvc := tenant.NewService(tenantRepo, authSvc)
	customerSvc := customer.NewService(customerRepo, rdb)
	expenseSvc := expense.NewService(expenseRepo)
	resourceSvc := resource.NewService(resourceRepo)
	fnbSvc := fnb.NewService(fnbRepo)
	reservationSvc := reservation.NewService(reservationRepo, resourceRepo, customerSvc, fnbSvc)
	scheduler := reservation.NewScheduler(db, reservationRepo)
	billingSvc := billing.NewService(db, billingRepo)
	platformSvc := platformadmin.NewService()

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

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Println("--------------------------------------------------")
	log.Printf("bookinaja engine starting on port %s", port)
	log.Printf("domain=%s", os.Getenv("APP_DOMAIN"))
	log.Printf("storage=cloudflare-r2")
	log.Println("--------------------------------------------------")

	if err := r.Run(":" + port); err != nil {
		log.Fatalf("failed to run server: %v", err)
	}
}

func runMigration(db *sql.DB) {
	driver, err := postgres.WithInstance(db, &postgres.Config{})
	if err != nil {
		log.Fatalf("migration driver error: %v", err)
	}

	var lastErr error
	for _, migrationPath := range migrationCandidates() {
		m, migErr := migrate.NewWithDatabaseInstance(migrationPath, "postgres", driver)
		if migErr != nil {
			lastErr = migErr
			continue
		}

		if upErr := m.Up(); upErr != nil && upErr != migrate.ErrNoChange {
			lastErr = upErr
			continue
		}

		if verifyErr := verifyCoreTables(db); verifyErr != nil {
			lastErr = verifyErr
			continue
		}

		log.Printf("database schema is up to date via %s", migrationPath)
		return
	}

	log.Fatalf("migration failed: %v", lastErr)
}

func migrationCandidates() []string {
	rawCandidates := []string{}
	if envPath := os.Getenv("MIGRATION_PATH"); envPath != "" {
		rawCandidates = append(rawCandidates, envPath)
	}
	rawCandidates = append(rawCandidates, "migrations", "backend/migrations", "./backend/migrations", "../migrations")

	seen := map[string]bool{}
	result := make([]string, 0, len(rawCandidates))
	for _, candidate := range rawCandidates {
		if candidate == "" {
			continue
		}

		if len(candidate) >= 7 && candidate[:7] == "file://" {
			if !seen[candidate] {
				seen[candidate] = true
				result = append(result, candidate)
			}
			continue
		}

		absPath, err := filepath.Abs(candidate)
		if err != nil {
			continue
		}
		uri := "file://" + filepath.ToSlash(absPath)
		if !seen[uri] {
			seen[uri] = true
			result = append(result, uri)
		}
	}

	return result
}

func verifyCoreTables(db *sql.DB) error {
	requiredTables := []string{"tenants", "customers", "bookings"}
	for _, tableName := range requiredTables {
		var resolved sql.NullString
		if err := db.QueryRow(`SELECT to_regclass($1)`, "public."+tableName).Scan(&resolved); err != nil {
			return err
		}
		if !resolved.Valid || resolved.String == "" {
			return os.ErrNotExist
		}
	}
	return nil
}
