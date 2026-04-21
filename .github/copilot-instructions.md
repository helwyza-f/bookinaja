# Copilot Instructions for Bookinaja

Bookinaja is a full-stack SaaS booking platform with a Next.js frontend and Go backend, structured as a monorepo with two main services.

## Architecture Overview

The project follows a **microservices architecture** with clear separation of concerns:

- **Frontend (`saas-app/`)**: Next.js 16 (React 19, TypeScript, App Router) with Tailwind CSS and shadcn/ui components
- **Backend (`saas/`)**: Go + Gin HTTP framework with PostgreSQL and Redis
- **Database**: PostgreSQL with SQL migrations (golang-migrate)
- **Cache**: Redis for sessions and caching
- **Deployment**: Docker Compose (with separate dev and production configs)

### Directory Structure

```
saas-app/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── (dashboard)   # Protected dashboard routes
│   │   ├── (marketing)   # Public marketing pages
│   │   └── login/        # Authentication pages
│   ├── components/       # Reusable React components
│   ├── context/          # React context providers
│   ├── lib/              # Utilities and helpers
│   ├── types/            # TypeScript type definitions
│   └── proxy.ts          # Backend proxy/API client

saas/
├── cmd/api/              # Application entry point
├── internal/             # Domain-driven packages
│   ├── auth/             # Authentication & authorization
│   ├── customer/         # Customer management
│   ├── fnb/              # Food & beverage features
│   ├── reservation/      # Booking/reservation logic
│   ├── tenant/           # Multi-tenant support
│   ├── platform/         # Infrastructure layer
│   │   ├── database.go   # DB connection & migrations
│   │   └── http.go       # HTTP server setup
│   └── [other domains]   # Additional business logic
├── migrations/           # SQL migration files (golang-migrate format)
├── Makefile              # Common development tasks
└── Dockerfile            # Container image
```

## Build, Test, and Lint Commands

### Frontend (saas-app/)

```bash
# Development server (auto-reload on code changes)
npm run dev

# Production build (creates .next/ directory)
npm run build

# Start production server (requires prior build)
npm start

# Linting (ESLint 9 with Next.js config)
npm run lint
```

**Note**: React Compiler is enabled in `next.config.ts` for automatic memoization.

### Backend (saas/)

```bash
# Run development server (with auto-reload via Makefile)
make run

# Database migrations (automatically run on startup)
make migrate-up      # Apply pending migrations
make migrate-down    # Rollback one migration

# Database management
make db-reset        # Drop all tables and recreate schema (fresh start)
make db-shell        # Open psql shell to the dev database

# Seed data (if exists)
make seed

# Tests (if implemented)
make test

# Clean build artifacts
make clean
```

**Environment**: Uses `.env` files with PostgreSQL credentials and database URLs.

### Full Stack (Docker Compose)

```bash
# Development environment (localhost:3000 for frontend, :8080 for backend)
docker-compose -f docker-compose.dev.yml up

# Production environment (remapped ports: 3001, 8081)
docker-compose up -d
```

**Database**: `postgres://devuser:devpassword@localhost:5432/bookinaja_dev`

## Key Conventions

### Frontend (Next.js)

1. **App Router**: All routes defined in `src/app/` using file-based routing
   - Routes in parentheses `(dashboard)` are layout groups and don't affect URL
   - Protected routes can be guarded via middleware

2. **Component Patterns**:
   - Use shadcn/ui components (imported via `components.json` configuration)
   - Tailwind CSS for styling (with class-variance-authority for component variants)
   - React Hook Form for form handling

3. **Path Aliases**: Use `@/*` to import from `src/` (configured in `tsconfig.json`)
   ```typescript
   import { Button } from '@/components/ui/button';
   ```

4. **API Integration**: Backend calls via `src/proxy.ts` (centralizes API client configuration)

5. **Environment Variables**: 
   - Dev: `.env.local` (not committed)
   - Build-time config in `.env` (committed)
   - Allowed origins configured for Server Actions in `next.config.ts`

6. **Image Optimization**: Remote images from `cdn.bookinaja.com` (configured in `next.config.ts`)

7. **Theme Support**: Uses `next-themes` for light/dark mode persistence

### Backend (Go)

1. **Domain-Driven Design**: Each business domain (`auth`, `reservation`, `tenant`, etc.) is a separate package under `internal/`
   - Each domain handles its own business logic and HTTP handlers
   - Shared infrastructure in `internal/platform/`

2. **Database**:
   - PostgreSQL via `sqlx` for type-safe queries
   - Migrations in `migrations/` using golang-migrate (SQL files)
   - Connection pooling configured in `internal/platform/database.go`
   - Auto-migration on startup (`database.NewMigrator()` in main)

3. **HTTP Framework**: Gin router configured in `internal/platform/http.go`
   - Middleware for logging, error handling, auth validation
   - CORS and security headers configured

4. **Configuration**: 
   - Loaded from `.env` file via `godotenv`
   - Fallback to system environment variables
   - Connection retry logic (5 attempts with backoff)

5. **Authentication**: JWT tokens via `golang-jwt` with bcrypt password hashing

6. **AWS Integration**: S3 via AWS SDK v2 for file uploads (e.g., to Cloudflare R2)

7. **Package Structure**:
   ```go
   internal/auth/
   ├── handler.go        // HTTP handlers
   ├── service.go        // Business logic
   ├── repository.go     // DB queries
   └── model.go          // Domain model
   ```

### Shared Conventions

1. **Error Handling**:
   - Frontend: Use `sonner` for toast notifications
   - Backend: Return structured JSON error responses with HTTP status codes

2. **Multi-Tenancy**: Tenant context passed through requests for data isolation

3. **CORS & Security**: 
   - Backend allows requests from `bookinaja.com` subdomains
   - Frontend validates origins for Server Actions
   - Cookies via `cookies-next` for auth tokens

4. **Commit Messages**: Include descriptive messages and reference issues when applicable

5. **Environment Parity**: 
   - Dev (`docker-compose.dev.yml`): Port 5432, 6379, localhost
   - Prod (`docker-compose.yml`): Remapped ports (5433, 6380, 8081, 3001) to avoid conflicts

## Critical Implementation Notes

- **Next.js Version**: Running Next.js 16.2.1 (very recent) — check `node_modules/next/dist/docs/` if APIs seem unfamiliar
- **React Version**: React 19.2.4 with new JSX transform
- **TypeScript**: Strict mode enabled — all code must be type-safe
- **Output Mode**: Frontend configured as `standalone` for Docker deployment
- **Database Retry**: Backend retries 5 times before failing (handles migration timing)
- **React Compiler**: Enabled in production — do not disable without cause

## Development Workflow

1. **Local Setup**:
   ```bash
   cd saas-app && npm install && npm run dev    # Terminal 1: Frontend (http://localhost:3000)
   cd saas && make run                           # Terminal 2: Backend (http://localhost:8080)
   docker-compose -f docker-compose.dev.yml up # Terminal 3: DB & Redis
   ```

2. **Or use Docker Compose** for the full stack:
   ```bash
   docker-compose -f docker-compose.dev.yml up
   ```

3. **Database Changes**:
   - Create new migration: `migrations/YYYYMMDDHHMMSS_description.up.sql`
   - Auto-runs on backend startup via golang-migrate

4. **Code Generation**:
   - Run `npm run lint` to fix ESLint issues in frontend
   - Use Go code generators if needed for database models

## Common Troubleshooting

- **Port conflicts**: Dev uses 5432/6379, prod uses 5433/6380
- **CORS errors**: Check `allowedOrigins` in `next.config.ts` and backend CORS middleware
- **DB connection fails**: Ensure PostgreSQL is running and `.env` has correct credentials
- **Migration errors**: Check SQL syntax and rollback with `make migrate-down` before retrying
- **Frontend won't build**: Check Node version (v20+ recommended) and clear `.next` cache
