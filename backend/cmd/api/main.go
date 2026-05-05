package main

import (
	"context"
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
	platformmqtt "github.com/helwiza/backend/internal/platform/mqtt"
	platformrealtime "github.com/helwiza/backend/internal/platform/realtime"
	"github.com/helwiza/backend/internal/platformadmin"
	"github.com/helwiza/backend/internal/reservation"
	"github.com/helwiza/backend/internal/resource"
	"github.com/helwiza/backend/internal/smartdevice"
	"github.com/helwiza/backend/internal/tenant"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("info: .env file not found, using system environment variables")
	}

	mqttConfig, mqttErr := platformmqtt.LoadConfig()
	if mqttErr != nil {
		log.Fatalf("mqtt config error: %v", mqttErr)
	}
	if mqttConfig.Enabled() {
		if _, tlsErr := mqttConfig.TLSConfig(); tlsErr != nil {
			log.Fatalf("mqtt tls config error: %v", tlsErr)
		}
		log.Printf("mqtt config loaded: broker=%s tls=%t ws=%s", mqttConfig.BrokerAddress(), mqttConfig.UseTLS, mqttConfig.WebSocketAddress())
	}

	var mqttClient *platformmqtt.Client
	if mqttConfig.Enabled() {
		mqttClient, mqttErr = platformmqtt.NewClient(mqttConfig)
		if mqttErr != nil {
			log.Fatalf("mqtt client init error: %v", mqttErr)
		}
		if mqttConfig.ConnectOnBoot {
			connectCtx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
			defer cancel()

			if connectErr := mqttClient.Connect(connectCtx); connectErr != nil {
				log.Fatalf("mqtt connect error: %v", connectErr)
			}
			defer mqttClient.Disconnect(250)
		} else {
			log.Printf("mqtt connect on boot disabled: client_id=%s broker=%s", mqttConfig.ClientID, mqttConfig.BrokerAddress())
		}
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
	customerRepo := customer.NewRepository(db, rdb)
	expenseRepo := expense.NewRepository(db)
	resourceRepo := resource.NewRepository(db, rdb)
	reservationRepo := reservation.NewRepository(db)
	fnbRepo := fnb.NewRepository(db, rdb)
	billingRepo := billing.NewRepository(db)
	platformRepo := platformadmin.NewRepository(db)
	midtransRepo := midtranssvc.NewRepository(db, rdb)
	smartDeviceRepo := smartdevice.NewRepository(db)

	authSvc := auth.NewService()
	tenantSvc := tenant.NewService(tenantRepo, authSvc)
	customerSvc := customer.NewService(customerRepo, rdb)
	expenseSvc := expense.NewService(expenseRepo)
	resourceSvc := resource.NewService(resourceRepo)
	fnbSvc := fnb.NewService(fnbRepo)
	realtimeHub := platformrealtime.NewHub()
	smartDeviceSvc := smartdevice.NewService(smartDeviceRepo, mqttClient, realtimeHub)
	reservationSvc := reservation.NewService(reservationRepo, resourceRepo, customerSvc, fnbSvc, smartDeviceSvc, realtimeHub)
	scheduler := reservation.NewScheduler(db, reservationRepo, smartDeviceSvc)
	billingSvc := billing.NewService(db, billingRepo, realtimeHub)
	platformSvc := platformadmin.NewService()
	dispatcher := smartdevice.NewDispatcher(smartDeviceRepo, mqttClient)
	subscriber := smartdevice.NewSubscriber(smartDeviceSvc, mqttClient)
	reconciler := smartdevice.NewReconciler(smartDeviceSvc, 90*time.Second)

	authHdl := auth.NewHandler(authSvc, tenantSvc)
	customerHdl := customer.NewHandler(customerSvc)
	expenseHdl := expense.NewHandler(expenseSvc)
	tenantHdl := tenant.NewHandler(tenantSvc)
	resourceHdl := resource.NewHandler(resourceSvc)
	reservationHdl := reservation.NewHandler(reservationSvc, tenantSvc)
	fnbHdl := fnb.NewHandler(fnbSvc)
	billingHdl := billing.NewHandler(billingSvc)
	platformHdl := platformadmin.NewHandler(platformSvc, platformRepo)
	midtransSvc := midtranssvc.NewService(db, midtransRepo, realtimeHub)
	midtransHdl := midtranssvc.NewHandler(midtransSvc)
	smartDeviceHdl := smartdevice.NewHandler(smartDeviceSvc)
	realtimeHdl := platformrealtime.NewHandler(realtimeHub)

	routerConfig := routecfg.Config{
		DB:                 db,
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
		SmartDeviceHandler: smartDeviceHdl,
		RealtimeHandler:    realtimeHdl,
	}

	r := http.NewRouter(routerConfig, db, rdb)

	if subscriber != nil {
		if err := subscriber.Start(context.Background()); err != nil {
			log.Fatalf("mqtt subscriber init error: %v", err)
		}
	}
	if err := smartDeviceSvc.BootstrapMissingCommands(context.Background()); err != nil {
		log.Printf("smart device bootstrap skipped: %v", err)
	}
	dispatcher.Start()
	reconciler.Start()
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
			log.Printf("migration source failed for %s: %v", migrationPath, migErr)
			lastErr = migErr
			continue
		}

		if upErr := m.Up(); upErr != nil && upErr != migrate.ErrNoChange {
			log.Printf("migration apply failed for %s: %v", migrationPath, upErr)
			lastErr = upErr
			continue
		}

		if verifyErr := verifyCoreTables(db); verifyErr != nil {
			log.Printf("migration verify failed for %s: %v", migrationPath, verifyErr)
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
	rawCandidates = append(rawCandidates, "migrations", "backend/migrations", "./backend/migrations")

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
