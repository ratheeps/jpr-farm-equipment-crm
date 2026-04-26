# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Production build
pnpm start            # Start production server
pnpm lint             # Run ESLint

# Database (Drizzle ORM)
pnpm db:generate      # Generate migration files from schema changes
pnpm db:migrate       # Apply pending migrations
pnpm db:push          # Push schema directly (dev only)
pnpm db:studio        # Open Drizzle Studio GUI

# Seed the database
pnpm db:seed
```

Tests run via `pnpm test` (vitest).

## Environment Setup

Copy `.env.example` to `.env.local`. Required variables:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — Minimum 32 characters
- `STORAGE_*` — S3-compatible storage (MinIO locally, or AWS S3/R2 in prod)

Docker Compose is available for local PostgreSQL: `docker compose up -d`

## Architecture

### Routing

The app uses Next.js App Router with two layers of dynamic routing:

1. **`[locale]`** — All UI routes are locale-prefixed (`/ta/`, `/si/`, `/en/`). Middleware enforces this and handles redirects.
2. **Route groups** — `(auth)` for public login pages; `(dashboard)` for protected routes behind JWT auth.

Protected dashboard routes are further split by role: `/owner`, `/admin`, `/operator`, `/auditor`. The middleware (`src/middleware.ts`) verifies the JWT cookie and enforces role-based access — e.g., an `operator` can only reach `/operator/*`.

### Authentication

Custom JWT implementation — no Auth.js or external auth providers. The session cookie is named `jpr_session` (httpOnly, sameSite=lax). Key files:
- `src/lib/auth/jwt.ts` — HS256 signing/verification
- `src/lib/auth/session.ts` — Cookie get/set helpers (`getSession`, `requireSession`, `isRole`)
- `src/lib/auth/password.ts` — bcryptjs with 12 rounds

### Database Layer

Drizzle ORM with PostgreSQL. Schema is split by domain in `src/db/schema/`:
- `auth.ts` — users (roles: super_admin, admin, operator, auditor)
- `vehicles.ts` — equipment with billing models (hourly/per_acre/per_km/per_task)
- `daily-logs.ts` — work log entries with GPS, engine hours, fuel
- `expenses.ts` — cost tracking per vehicle/project
- `farms.ts` — paddy farm lifecycle stages
- `finance.ts` — loans, receivables, financial transactions
- `invoices.ts`, `maintenance.ts`, `projects.ts`, `staff.ts`

`src/db/index.ts` exports the Drizzle client and a `withRLS()` helper that sets PostgreSQL session variables (`app.current_user_id`, `app.current_user_role`) for row-level security. Use `withRLS()` for queries that need RLS enforcement.

All database operations are in Next.js Server Actions (`src/lib/actions/`) rather than REST API routes. The API routes in `src/app/api/` are limited to auth and offline sync.

### Offline-First Sync

Operators work in remote fields with poor connectivity. The app uses:
- **Dexie.js** (`src/lib/offline/db.ts`) — IndexedDB stores for `offlineLogs` and `offlineExpenses`
- **Sync engine** (`src/lib/offline/sync.ts`) — pushes local records to `/api/logs/sync` and `/api/expenses/sync` when online
- Records have a `syncStatus` field: `local | synced | error`
- `clientDeviceId` prevents duplicate inserts on re-sync

### Internationalization

`next-intl` with three locales: Tamil (`ta`, default), Sinhala (`si`), English (`en`). The default locale (`ta`) reflects the primary user base. Locale is stored in the user's DB record and synced via `POST /api/auth/locale`.

### PWA / Service Worker

Serwist (`@serwist/next`) handles service worker registration. SW is disabled in dev, active in production. The SW file is at `src/workers/sw.ts`.

## Key Conventions

- **Path alias**: `@/*` maps to `src/*`
- **Styling**: Tailwind CSS with CSS variable–based theming (HSL). Dark mode uses the `class` strategy.
- **Components**: Radix UI primitives + class-variance-authority for variants. Component library lives in `src/components/`.
- **State**: Zustand for client state, React Query (`@tanstack/react-query`) for server state/caching.
- **No vendor lock-in**: All infrastructure choices are portable (custom JWT, standard PostgreSQL, S3-compatible storage). Do not introduce proprietary SDKs or managed auth services.
