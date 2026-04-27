include .env
export

# Database URL untuk migrasi & operasional
# Menggunakan format yang mendukung karakter khusus di password
DB_URL=postgres://$(DB_USER):$(DB_PASSWORD)@$(DB_HOST):$(DB_PORT)/$(DB_NAME)?sslmode=require

.PHONY: run migrate-up migrate-down db-reset seed db-shell test clean

# 1. Jalankan Aplikasi
run:
	@echo "🚀 Starting Server..."
	go run ./cmd/api/main.go

# 2. Migrasi Database Manual
migrate-up:
	@echo "⬆️ Running Migrations..."
	migrate -path ./migrations -database "$(DB_URL)" up

migrate-down:
	@echo "⬇️ Rolling back Migrations..."
	migrate -path ./migrations -database "$(DB_URL)" down 1

# 3. RESET DATABASE (FRESH START)
# Menghapus schema public dan membuatnya kembali untuk membersihkan semua tabel & data
db-reset:
	@echo "🧨 Resetting Database (Dropping all tables)..."
	psql "$(DB_URL)" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;"
	@echo "✅ Database is fresh. Now run 'make run' to migrate automatically."

# 4. Seeding Data Awal (Opsional jika ada file sql)
seed:
	@echo "🌱 Seeding initial data..."
	psql "$(DB_URL)" -f scripts/seed.sql

# 5. Buka Database CLI
db-shell:
	psql "$(DB_URL)"

# 6. Testing
test:
	@echo "🧪 Running Tests..."
	go test -v ./...

# 7. Bersihkan Binary & Cache
clean:
	@echo "🧹 Cleaning up..."
	go clean
	rm -f main