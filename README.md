# Wellspring

Wellspring is a multi-tenant content management platform for wellness creators.

Phase 1 establishes the backend and database foundation:
- Express + TypeScript API in `apps/api`
- PostgreSQL schema managed through Supabase SQL migrations
- split admin/runtime database roles
- RLS-based tenant isolation with transaction-local tenant context
- deterministic seed data

## Tech Stack

- Next.js
- Node.js + Express
- TypeScript
- PostgreSQL hosted on Supabase
- Tailwind CSS
- shadcn/ui

## Repository Structure

- `apps/web` Next.js admin panel
- `apps/api` Express API
- `packages/shared` shared package placeholder
- `supabase` SQL migrations and role definitions
- `docs` project documentation
- `ai-history` AI development history

## Environment Setup

1. Copy `.env.example` values into `.env.local`.
2. Set `DATABASE_ADMIN_URL` to the Supabase `postgres` connection.
3. Set `DATABASE_URL` to the restricted runtime role connection for `wellspring_app`.
4. Keep `.env.local` private and untracked.

## Commands

- `npm run dev` starts the web app and API together.
- `npm run dev:web` starts the Next.js app.
- `npm run dev:api` starts the Express API with `tsx watch`.
- `npm run build` builds `apps/web` and `apps/api`.
- `npm run test` runs the API test suite, including tenant-isolation integration tests.
- `npm run db:migrate` pushes SQL migrations to Supabase and bootstraps the runtime DB role password.
- `npm run db:seed` seeds 2 creators, 3 programs per creator, and about 10 sessions per program.

## Phase 1 Database Foundation

- Migrations live under `supabase/migrations`.
- Custom DB roles live in `supabase/roles.sql`.
- Tenant-owned tables use `creator_id uuid not null default app.current_creator_id()`.
- The API uses a transaction helper that sets `app.current_creator_id` locally before tenant-scoped queries.
- RLS with `FORCE ROW LEVEL SECURITY` protects tenant-owned tables for the runtime role.

## Current API Surface

- `GET /health` returns `{ "status": "ok" }`.

## Notes

- Supabase is used as hosted PostgreSQL only.
- Supabase Auth and Supabase Storage are not used for application features.
- The frontend must not query application tables directly.
- Full auth, CRUD routes, CSV import, uploads, and admin screens are deferred to later phases.
