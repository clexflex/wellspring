# Code Summary

## `apps/api`

- `src/app.ts`: Express app factory with JSON middleware, request logging, health route, and centralized error handling.
- `src/config/env.ts`: Zod-based environment validation for API and database configuration.
- `src/db/admin.ts`: admin database pool for migrations, seed, and privileged test setup.
- `src/db/pool.ts`: runtime database pool for the restricted app role.
- `src/db/tenant-context.ts`: reusable transaction helper that sets the tenant context with `SET LOCAL` semantics via `set_config(..., true)`.
- `src/db/test-helpers.ts`: database reset and tenant-isolation fixture helpers for integration tests.
- `src/scripts/bootstrap-db-role.ts`: syncs the runtime role password with `DATABASE_URL` after role creation.
- `src/scripts/seed-data.ts`: deterministic seed fixtures.
- `src/scripts/seed.ts`: transactional seed entrypoint.

## `supabase`

- `roles.sql`: restricted runtime role definition for `wellspring_app`.
- `migrations/*`: handwritten SQL schema, indexes, grants, helper functions, and RLS policies.

## Test Coverage Added In Phase 1

- health endpoint contract
- env validation failures
- database-layer tenant isolation for reads, updates, forged `creator_id`, and cross-tenant session linkage
