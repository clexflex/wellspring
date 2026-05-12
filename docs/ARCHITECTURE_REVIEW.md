# Architecture Review

## Phase 1 Through 3 Decisions

- The API talks to PostgreSQL through `pg` directly instead of an ORM.
- Schema changes are migration-managed SQL under `supabase/migrations`.
- Tenant isolation is enforced at the data layer through RLS, composite tenant-aware foreign keys, and a transaction-local tenant context.
- Database access is split between an admin role for migrations/seed and a restricted runtime role for application queries.
- Creator authentication is custom JWT auth implemented in the Express API.
- Audit logs are read and written through the runtime role under tenant context; no admin connection participates in normal request flows.

## Why This Shape

- Raw SQL makes role setup, grants, RLS policies, and composite foreign keys explicit.
- A restricted runtime role means the application cannot silently bypass RLS by connecting as `postgres`.
- `withTenantContext` keeps tenant scoping close to the transaction boundary instead of trusting controller input.
- `public.creators` is handled as a narrow auth identity table because signup and login must work before a tenant context exists.
- The audit helper accepts an existing runtime `PoolClient` so future write flows can persist their audit row in the same transaction as the write they describe.

## Auth Tradeoffs

- The runtime role has limited direct access to `public.creators` for `SELECT`, `INSERT`, and password-hash updates only.
- Tenant-owned content tables remain on RLS + `withTenantContext`; auth does not weaken those protections.
- Password reset confirmation uses a private `app.consume_password_reset_token(...)` function because the token must be consumed safely before a tenant context can be established.
- The reset-consume function now returns the affected creator id so the same runtime transaction can immediately write `PASSWORD_RESET_CONFIRMED` into `audit_logs`.
- Existing JWTs are not revoked on password change in this phase.

## Audit Design

- `audit_logs` remains a tenant-owned table protected by RLS and `FORCE ROW LEVEL SECURITY`.
- `recordAuditLog(client, entry)` assumes the caller already activated tenant context on the provided runtime client.
- `GET /api/audit-logs` uses `withTenantContext(auth.creatorId, ...)` and orders rows by `created_at desc, id desc`.
- Pagination uses opaque cursors over `(created_at, id)` instead of offset pagination so page boundaries remain stable as new audit rows arrive.
- Auth write flows now emit:
  - `CREATOR_SIGNED_UP`
  - `PASSWORD_RESET_REQUESTED`
  - `PASSWORD_RESET_CONFIRMED`

## Request Logging

- Request logs now emit one canonical structured payload per request:
  - `request_id`
  - `tenant_id`
  - `method`
  - `path`
  - `status_code`
- The previous duplication bug came from mixing mutable `req.url` with pino-http custom props; the logger now records `req.originalUrl` on response finish so mounted routes log the correct path once.

## Honest Gaps After Phase 3

- No program/session CRUD endpoints yet.
- No CSV import, S3 upload flow, or frontend auth screens yet.
- Audit coverage is intentionally limited to the auth write flows implemented so far; future program/session/import/upload writes still need to call the shared helper.
- Bearer tokens are the only auth transport; cookie/session handling is deferred.
