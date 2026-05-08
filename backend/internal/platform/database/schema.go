package database

import (
	"database/sql"
	"errors"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

var (
	schemaMu         sync.Mutex
	lastSchemaCheck  time.Time
	lastSchemaResult error
)

const schemaCheckTTL = 10 * time.Second

func EnsureCoreSchema(db *sql.DB) error {
	schemaMu.Lock()
	defer schemaMu.Unlock()

	if time.Since(lastSchemaCheck) < schemaCheckTTL && lastSchemaResult == nil {
		return nil
	}

	if err := verifyCoreTables(db); err == nil {
		lastSchemaCheck = time.Now()
		lastSchemaResult = nil
		return nil
	}

	if err := runMigration(db); err != nil {
		lastSchemaCheck = time.Now()
		lastSchemaResult = err
		return err
	}

	lastSchemaCheck = time.Now()
	lastSchemaResult = nil
	return nil
}

func runMigration(db *sql.DB) error {
	driver, err := postgres.WithInstance(db, &postgres.Config{})
	if err != nil {
		return err
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

		return nil
	}

	if lastErr == nil {
		lastErr = errors.New("no migration source could be resolved")
	}
	return lastErr
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
