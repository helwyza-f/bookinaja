package main

import (
	"context"
	"log"
	stdhttp "net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jmoiron/sqlx"

	"github.com/helwiza/backend/internal/auth"
	"github.com/helwiza/backend/internal/billing"
	"github.com/helwiza/backend/internal/customer"
	"github.com/helwiza/backend/internal/expense"
	"github.com/helwiza/backend/internal/fnb"
	"github.com/helwiza/backend/internal/platform/database"
	"github.com/helwiza/backend/internal/platform/http"
	"github.com/helwiza/backend/internal/platform/http/routecfg"
	"github.com/helwiza/backend/internal/platform/mailer"
	midtranssvc "github.com/helwiza/backend/internal/platform/midtrans"
	platformmqtt "github.com/helwiza/backend/internal/platform/mqtt"
	platformrealtime "github.com/helwiza/backend/internal/platform/realtime"
	"github.com/helwiza/backend/internal/platformadmin"
	"github.com/helwiza/backend/internal/promo"
	"github.com/helwiza/backend/internal/reservation"
	"github.com/helwiza/backend/internal/resource"
	"github.com/helwiza/backend/internal/sales"
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

	if err := database.EnsureCoreSchema(db.DB); err != nil {
		log.Fatalf("migration failed: %v", err)
	}

	tenantRepo := tenant.NewRepository(db, rdb)
	customerRepo := customer.NewRepository(db, rdb)
	expenseRepo := expense.NewRepository(db)
	resourceRepo := resource.NewRepository(db, rdb)
	salesRepo := sales.NewRepository(db)
	reservationRepo := reservation.NewRepository(db, rdb)
	fnbRepo := fnb.NewRepository(db, rdb)
	promoRepo := promo.NewRepository(db)
	billingRepo := billing.NewRepository(db, rdb)
	platformRepo := platformadmin.NewRepository(db)
	midtransRepo := midtranssvc.NewRepository(db, rdb)
	smartDeviceRepo := smartdevice.NewRepository(db)
	resendMailer := mailer.NewResendFromEnv()

	authSvc := auth.NewService()
	tenantSvc := tenant.NewService(tenantRepo, authSvc)
	customerSvc := customer.NewService(
		customerRepo,
		rdb,
		customer.WithMailer(resendMailer),
		customer.WithEmailAudit(platformRepo),
	)
	expenseSvc := expense.NewService(expenseRepo)
	resourceSvc := resource.NewService(resourceRepo)
	realtimeHub := platformrealtime.NewHub()
	salesSvc := sales.NewService(salesRepo, resourceRepo, billingRepo, customerSvc, db, realtimeHub)
	fnbSvc := fnb.NewService(fnbRepo)
	promoSvc := promo.NewService(promoRepo)
	smartDeviceSvc := smartdevice.NewService(smartDeviceRepo, mqttClient, realtimeHub)
	reservationSvc := reservation.NewService(reservationRepo, resourceRepo, customerSvc, fnbSvc, promoSvc, smartDeviceSvc, realtimeHub)
	scheduler := reservation.NewScheduler(db, reservationRepo, smartDeviceSvc)
	billingSvc := billing.NewService(db, billingRepo, realtimeHub)
	platformSvc := platformadmin.NewService(resendMailer, platformRepo)
	dispatcher := smartdevice.NewDispatcher(smartDeviceRepo, mqttClient)
	subscriber := smartdevice.NewSubscriber(smartDeviceSvc, mqttClient)
	reconciler := smartdevice.NewReconciler(smartDeviceSvc, 90*time.Second)

	authHdl := auth.NewHandler(authSvc, tenantSvc)
	customerHdl := customer.NewHandler(customerSvc)
	expenseHdl := expense.NewHandler(expenseSvc)
	tenantHdl := tenant.NewHandler(tenantSvc)
	resourceHdl := resource.NewHandler(resourceSvc)
	salesHdl := sales.NewHandler(salesSvc)
	reservationHdl := reservation.NewHandler(reservationSvc, tenantSvc)
	fnbHdl := fnb.NewHandler(fnbSvc)
	promoHdl := promo.NewHandler(promoSvc)
	billingHdl := billing.NewHandler(billingSvc)
	platformHdl := platformadmin.NewHandler(platformSvc, platformRepo)
	midtransSvc := midtranssvc.NewService(db, midtransRepo, realtimeHub, customerSvc)
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
		PromoHandler:       promoHdl,
		ExpenseHandler:     expenseHdl,
		SalesHandler:       salesHdl,
		BillingHandler:     billingHdl,
		PlatformHandler:    platformHdl,
		MidtransHandler:    midtransHdl,
		SmartDeviceHandler: smartDeviceHdl,
		RealtimeHandler:    realtimeHdl,
	}

	r := http.NewRouter(routerConfig, db, rdb)
	server := &stdhttp.Server{
		Addr:              ":" + resolvePort(),
		Handler:           r,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	if subscriber != nil {
		startCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		if err := subscriber.Start(startCtx); err != nil {
			cancel()
			log.Fatalf("mqtt subscriber init error: %v", err)
		}
		cancel()
	}
	if err := smartDeviceSvc.BootstrapMissingCommands(context.Background()); err != nil {
		log.Printf("smart device bootstrap skipped: %v", err)
	}
	dispatcher.Start()
	reconciler.Start()
	scheduler.Start()

	port := resolvePort()

	log.Println("--------------------------------------------------")
	log.Printf("bookinaja engine starting on port %s", port)
	log.Printf("domain=%s", os.Getenv("APP_DOMAIN"))
	log.Printf("storage=cloudflare-r2")
	log.Println("--------------------------------------------------")

	go func() {
		if err := server.ListenAndServe(); err != nil && err != stdhttp.ErrServerClosed {
			log.Fatalf("failed to run server: %v", err)
		}
	}()

	stopSignal := make(chan os.Signal, 1)
	signal.Notify(stopSignal, syscall.SIGINT, syscall.SIGTERM)
	<-stopSignal

	log.Println("shutdown signal received, draining server...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	scheduler.Stop()
	dispatcher.Stop()
	reconciler.Stop()
	if mqttClient != nil {
		mqttClient.Disconnect(250)
	}
	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Printf("graceful shutdown failed: %v", err)
	}
}

func resolvePort() string {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	return port
}
