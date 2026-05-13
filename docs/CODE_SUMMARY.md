# Code Summary

## `apps/api`

- `src/app.ts`: Express app factory with JSON middleware, request logging, health route, auth routes, and centralized error handling.
- `src/config/env.ts`: Zod-based environment validation for API, database, and auth configuration.
- `src/auth/creator-repository.ts`: the only direct runtime-role access path to `public.creators` for signup/login/me.
- `src/auth/password-reset-repository.ts`: password reset token creation through tenant context and confirm through the private DB function.
- `src/auth/passwords.ts`: bcrypt-based password hashing and comparison helpers.
- `src/auth/jwt.ts`: JWT signing and verification helpers for creator auth tokens.
- `src/auth/service.ts`: auth orchestration for signup, login, password reset, current-creator lookup, and auth-triggered audit writes.
- `src/auth/presenters.ts`: creator response sanitization that excludes password hashes.
- `src/audit/actions.ts`: shared audit action and target-type constants for future write modules.
- `src/audit/record.ts`: low-level audit insert helper that uses the caller's tenant-scoped runtime client.
- `src/audit/repository.ts`: tenant-scoped audit log query helpers with filters and cursor pagination.
- `src/audit/service.ts`: route-facing audit log listing orchestration and cursor validation.
- `src/audit/presenters.ts`: audit API presenters plus opaque cursor encode/decode helpers.
- `src/programs/repository.ts`: explicit runtime-role SQL for program list/create/get/update/delete operations.
- `src/programs/service.ts`: tenant-scoped program CRUD orchestration, 404 mapping, and same-transaction audit writes.
- `src/programs/presenters.ts`: program API response mapping.
- `src/http/middleware/auth.ts`: Bearer token verification and authenticated request attachment.
- `src/http/routes/audit-logs.ts`: authenticated audit log endpoint definition.
- `src/http/routes/auth.ts`: auth endpoint definitions.
- `src/http/routes/programs.ts`: authenticated program CRUD endpoint definitions.
- `src/db/admin.ts`: admin database pool for migrations, seed, and privileged test setup.
- `src/db/pool.ts`: runtime database pool for the restricted app role.
- `src/db/tenant-context.ts`: reusable transaction helpers for new runtime transactions and existing runtime clients that need tenant context.
- `src/db/test-helpers.ts`: database reset, auth fixture helpers, program fixture helpers, audit fixture helpers, and tenant-isolation fixture helpers for integration tests.
- `src/lib/logger.ts`: structured JSON request logging with one canonical `request_id`, `tenant_id`, `method`, `path`, and `status_code` payload per request.
- `src/scripts/bootstrap-db-role.ts`: syncs the runtime role password with `DATABASE_URL` after role creation.
- `src/scripts/seed-data.ts`: deterministic seed fixtures, including stable dev passwords.
- `src/scripts/seed.ts`: transactional seed entrypoint that hashes seeded creator passwords.

## `supabase`

- `roles.sql`: restricted runtime role definition for `wellspring_app`.
- `migrations/*`: handwritten SQL schema, grants, helper functions, RLS policies, and audit query indexes.
- `app.consume_password_reset_token(...)`: private DB function that atomically validates a reset token, updates the password hash, marks the token as used, and returns the affected creator id.

## Test Coverage Added Through Phase 3

- health endpoint contract
- env validation failures
- database-layer tenant isolation for reads, updates, forged `creator_id`, and cross-tenant session linkage
- creator signup, login, bearer auth, password reset request/confirm, and sensitive-field exclusion
- tenant-scoped audit log retrieval, action/date filters, cursor pagination, and direct `recordAuditLog(...)` behavior
- tenant-safe program CRUD, cross-tenant 404 behavior, forged `creator_id` rejection, and audit logging on create/update/delete
- request logging shape with canonical top-level request metadata
