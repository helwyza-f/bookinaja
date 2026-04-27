# Bookinaja

A full-stack SaaS booking platform with Next.js frontend, Go backend, PostgreSQL database, and Redis caching.

## Overview

Bookinaja is a multi-tenant booking platform designed for managing reservations, customers, billing, and more. It uses a microservices architecture with clear separation between frontend and backend services.

**For detailed architecture, conventions, and implementation notes, see [.github/copilot-instructions.md](.github/copilot-instructions.md)**

## Tech Stack

- **Frontend:** Next.js 16 (React 19, TypeScript, Tailwind CSS)
- **Backend:** Go + Gin HTTP framework
- **Database:** PostgreSQL (with SQL migrations via golang-migrate)
- **Cache:** Redis
- **Deployment:** Docker Compose

## Project Structure

```
bookinaja/
├── frontend/          # Next.js frontend application
│   ├── src/
│   │   ├── app/       # Next.js App Router (pages, layouts, components)
│   │   ├── components/# Reusable React components (shadcn/ui)
│   │   ├── lib/       # Utilities and helpers
│   │   ├── types/     # TypeScript definitions
│   │   └── proxy.ts   # Backend API client
│   └── package.json
│
├── backend/              # Go backend application
│   ├── cmd/api/       # Application entry point
│   ├── internal/      # Domain packages (auth, reservation, tenant, etc.)
│   ├── migrations/    # SQL migration files
│   ├── Makefile       # Development commands
│   └── go.mod
│
├── docker-compose.dev.yml  # Development environment
├── docker-compose.yml      # Production environment
└── .github/copilot-instructions.md  # Detailed implementation guide
```

## Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# Development (all services with live reload)
docker-compose -f docker-compose.dev.yml up

# Runs:
# - PostgreSQL on :5432
# - Redis on :6379
# - Go backend on :8080
# - Next.js frontend on :3000
```

### Option 2: Local Development

**Requirements:**
- Node.js v20+ (for frontend)
- Go 1.25+ (for backend)
- PostgreSQL 15+
- Redis

**Terminal 1 - Frontend:**
```bash
cd frontend
npm install
npm run dev
# http://localhost:3000
```

**Terminal 2 - Backend:**
```bash
cd backend
make run
# http://localhost:8080
```

**Terminal 3 - Database:**
```bash
docker-compose -f docker-compose.dev.yml up postgres_db redis_cache
```

## Build & Deployment

### Frontend
```bash
cd frontend
npm run build      # Creates .next/ production build
npm start          # Runs production build
```

### Backend
```bash
cd backend
make migrate-up    # Apply database migrations
go build ./cmd/api # Compile binary
./api              # Run server
```

### Docker (Full Stack)
```bash
docker-compose up -d
# Frontend: http://localhost:3001
# Backend: http://localhost:8081
# DB: localhost:5433 (mapped from 5432)
```

## Development Commands

### Frontend (frontend/)
- `npm run dev` - Development server with hot reload
- `npm run build` - Production build
- `npm run lint` - Run ESLint

### Backend (backend/)
- `make run` - Start development server
- `make migrate-up` - Apply database migrations
- `make migrate-down` - Rollback one migration
- `make db-reset` - Drop and recreate database schema
- `make test` - Run tests (if configured)

## Database

**Connection string (dev):**
```
postgres://devuser:devpassword@localhost:5432/bookinaja_dev
```

**Migrations:**
- Located in `backend/migrations/`
- Auto-runs on backend startup
- Managed with [golang-migrate](https://github.com/golang-migrate/migrate)

**To create a new migration:**
```bash
# Migrations use SQL files: YYYYMMDDHHMMSS_description.up.sql
# Place in backend/migrations/ and they'll auto-run on next backend start
```

## Environment Configuration

Each service uses `.env` files (not committed to git):

**Frontend (.env.local):**
```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

**Backend (.env):**
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=devuser
DB_PASSWORD=devpassword
DB_NAME=bookinaja_dev
```

Copy `.env.example` files if they exist to get started.

## Code Style & Conventions

See [.github/copilot-instructions.md](.github/copilot-instructions.md) for:
- Next.js patterns and component conventions
- Go domain-driven design structure
- Multi-tenancy patterns
- Error handling practices
- API integration patterns

## Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker-compose -f docker-compose.dev.yml ps

# Reset database and migrations
cd backend && make db-reset
```

### Port Conflicts
- Dev: Uses standard ports (5432, 6379, 3000, 8080)
- Prod: Remapped to avoid conflicts (5433, 6380, 3001, 8081)

### Frontend Build Issues
```bash
# Clear Next.js cache
cd frontend && rm -rf .next && npm run build
```

### Backend Compilation Issues
```bash
# Update dependencies
cd backend && go mod tidy
```

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Commit: `git commit -m "Clear description of changes"`
4. Push: `git push origin feature/your-feature-name`
5. Open a pull request

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Go Documentation](https://golang.org/doc)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Gin Web Framework](https://gin-gonic.com/)
- [Implementation Guide](.github/copilot-instructions.md)