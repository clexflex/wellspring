# Code Summary

## `apps/api`

- `src/app.ts`: Express app factory with JSON middleware, request logging, health route, auth routes, and centralized error handling.
- `src/config/env.ts`: Zod-based environment validation for API, database, and auth configuration.
- `src/auth/creator-repository.ts`: the only direct runtime-role access path to `public.creators` for signup/login/me.
- `src/auth/password-reset-repository.ts`: password reset token creation through tenant context and confirm through the private DB function.
- `src/auth/passwords.ts`: bcrypt-based password hashing and comparison helpers.
- `src/auth/jwt.ts`: JWT signing and verification helpers for creator auth tokens.
- `src/auth/service.ts`: auth orchestration for signup, login, password reset, and current-creator lookup.
- `src/auth/presenters.ts`: creator response sanitization that excludes password hashes.
- `src/http/middleware/auth.ts`: Bearer token verification and authenticated request attachment.
- `src/http/routes/auth.ts`: auth endpoint definitions.
- `src/db/admin.ts`: admin database pool for migrations, seed, and privileged test setup.
- `src/db/pool.ts`: runtime database pool for the restricted app role.
- `src/db/tenant-context.ts`: reusable transaction helper that sets the tenant context with `SET LOCAL` semantics via `set_config(..., true)`.
- `src/db/test-helpers.ts`: database reset, auth fixture helpers, and tenant-isolation fixture helpers for integration tests.
- `src/scripts/bootstrap-db-role.ts`: syncs the runtime role password with `DATABASE_URL` after role creation.
- `src/scripts/seed-data.ts`: deterministic seed fixtures, including stable dev passwords.
- `src/scripts/seed.ts`: transactional seed entrypoint that hashes seeded creator passwords.

## `supabase`

- `roles.sql`: restricted runtime role definition for `wellspring_app`.
- `migrations/*`: handwritten SQL schema, grants, helper functions, and RLS policies.
- `app.consume_password_reset_token(...)`: private DB function that atomically validates a reset token, updates the password hash, and marks the token as used.

## Test Coverage Added Through Phase 2

- health endpoint contract
- env validation failures
- database-layer tenant isolation for reads, updates, forged `creator_id`, and cross-tenant session linkage
- creator signup, login, bearer auth, password reset request/confirm, and sensitive-field exclusion
