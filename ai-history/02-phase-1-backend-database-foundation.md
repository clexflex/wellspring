# 02 — Phase 1 Backend and Database Foundation

## Goal

Set up the Express TypeScript API, database tooling, migrations, tenant isolation strategy, and seed foundation for Wellspring.

## Original Codex Prompt

Implemented from the approved Phase 1 execution plan for backend/database foundation only.

## Codex Plan

- Create `apps/api` as an Express + TypeScript service.
- Add env validation, logging, a health endpoint, and database pools.
- Initialize Supabase migration tooling and add handwritten SQL migrations.
- Define a restricted runtime role in `supabase/roles.sql`.
- Enforce tenant isolation with RLS, `FORCE ROW LEVEL SECURITY`, composite tenant-aware foreign keys, and `withTenantContext`.
- Add deterministic seed data and integration tests proving data-layer isolation.
- Remove non-compliant Supabase client scaffolding from `apps/web`.

## What Changed

- Added API runtime/build/test/seed/bootstrap scripts.
- Added root scripts for `dev`, `build`, `test`, `db:migrate`, and `db:seed`.
- Added SQL migrations for `creators`, `programs`, `sessions`, `audit_logs`, `bulk_imports`, `bulk_import_rows`, and `password_reset_tokens`.
- Added `app.current_creator_id()` and a runtime transaction helper.
- Added a restricted `wellspring_app` role and runtime password bootstrap script.
- Added seed data for 2 creators, 3 programs per creator, and about 10 sessions per program.
- Added API tests for health, env validation, and tenant isolation.
- Removed the placeholder web Supabase client/auth helpers.

## Verification Run

- `npm run db:migrate`
- `npm run db:seed`
- `npm run test`
- `npm run build`

## Notes

- Supabase accepted custom role creation and the migration set on the hosted project.
- Auth, CRUD endpoints, CSV import, S3 uploads, audit log writes, and frontend screens remain out of scope for Phase 1.
