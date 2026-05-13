# Architecture Review

## Phase 1 Through 5 Decisions

- The API talks to PostgreSQL through `pg` directly instead of an ORM.
- Schema changes are migration-managed SQL under `supabase/migrations`.
- Tenant isolation is enforced at the data layer through RLS, composite tenant-aware foreign keys, and a transaction-local tenant context.
- Database access is split between an admin role for migrations/seed and a restricted runtime role for application queries.
- Creator authentication is custom JWT auth implemented in the Express API.
- Audit logs are read and written through the runtime role under tenant context; no admin connection participates in normal request flows.
- Program CRUD also runs entirely through the runtime role under tenant context; controllers never choose the tenant in SQL.
- Session CRUD and reorder also run entirely through the runtime role under tenant context, including all position maintenance.

## Why This Shape

- Raw SQL makes role setup, grants, RLS policies, and composite foreign keys explicit.
- A restricted runtime role means the application cannot silently bypass RLS by connecting as `postgres`.
- `withTenantContext` keeps tenant scoping close to the transaction boundary instead of trusting controller input.
- `public.creators` is handled as a narrow auth identity table because signup and login must work before a tenant context exists.
- The audit helper accepts an existing runtime `PoolClient` so future write flows can persist their audit row in the same transaction as the write they describe.
- Program CRUD keeps SQL explicit and small instead of introducing a repository abstraction layer beyond the minimal module boundary.
- Session CRUD extends that pattern and keeps ordering logic in explicit SQL rather than hiding it behind an ORM or trigger-heavy design.

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

## Program CRUD Design

- Program routes use `withTenantContext(auth.creatorId, ...)` for every read and write.
- Cross-tenant access returns `404` because RLS hides rows before the application can distinguish “missing” from “belongs to another tenant.”
- Program writes record audit rows in the same tenant transaction/client as the program mutation:
  - `PROGRAM_CREATED`
  - `PROGRAM_UPDATED`
  - `PROGRAM_DELETED`
- Program list pagination is intentionally simple in Phase 4: `limit + offset`, ordered by `updated_at desc, id desc`.
- Program deletion follows the existing schema contract and cascade-deletes sessions because `sessions_program_fk` is already `on delete cascade`.

## Session CRUD and Reorder Design

- Phase 5 adds session metadata columns because the original `sessions` table only had `title`, `description`, and `position` beyond the tenant/program keys.
- Session routes validate parent program ownership through the same tenant-scoped runtime client used for the session operation.
- Cross-tenant session and parent-program access still resolves to `404` because RLS hides rows before the application can distinguish ownership.
- Session writes record audit rows in the same tenant transaction/client as the session mutation:
  - `SESSION_CREATED`
  - `SESSION_UPDATED`
  - `SESSION_DELETED`
  - `SESSIONS_REORDERED`
- Position handling is contiguous by design:
  - create with omitted `position` appends
  - create with explicit `position` shifts later siblings upward
  - delete renumbers later siblings downward
- Reorder uses a two-phase temporary high-positive-offset strategy, not temporary negatives, because the current schema enforces `position > 0`.
- The reorder request must exactly match the current program session id set before any positions are changed.

## Request Logging

- Request logs now emit one canonical structured payload per request:
  - `request_id`
  - `tenant_id`
  - `method`
  - `path`
  - `status_code`
- The previous duplication bug came from mixing mutable `req.url` with pino-http custom props; the logger now records `req.originalUrl` on response finish so mounted routes log the correct path once.

## CSV Import and Idempotency Design

- Phase 6 adds `POST /api/programs/:programId/sessions/import` for tenant-scoped bulk session import from JSON payloads containing CSV text.
- The route is runtime-role only and runs entirely inside `withTenantContext(auth.creatorId, ...)`.
- Program ownership is validated with tenant-scoped `findProgramById(...)`; cross-tenant or missing programs return `404`.
- CSV parsing uses `csv-parse/sync` with strict header rules:
  - required: `title`, `durationSeconds`, `instructorName`
  - optional: `description`, `tags`, `mediaUrl`, `mediaType`, `position`
  - disallowed: `creator_id`, `program_id`
  - unknown headers reject the whole request
- `tags` are pipe-delimited (`tag1|tag2|tag3`), trimmed, empties dropped, and deduplicated.
- `position` is accepted as a column but ignored in this phase; valid imported rows append in CSV order after current max position.
- Row-level feedback is persisted in `bulk_import_rows` for every parsed data row:
  - `status` (`inserted` or `failed`)
  - `error_message` for quick diagnostics
  - structured `payload` including normalized row data, `errors[]`, and inserted `sessionId` when available

### Idempotency Behavior

- Idempotency key is `clientImportId`, scoped by tenant via existing DB constraint:
  - `unique (creator_id, client_import_id)` on `bulk_imports`
- First request path:
  - insert `bulk_imports` row with `pending`
  - parse + validate rows
  - insert valid sessions and row feedback
  - update summary/status
  - write `SESSIONS_IMPORTED` audit row in the same transaction
- Retry path:
  - `insert ... on conflict do nothing` indicates prior import exists
  - return the previously persisted import + row feedback with `replayed: true`
  - no duplicate session inserts occur
- Same `clientImportId` is allowed across different creators due tenant-scoped uniqueness.

### Failure Modes and Tradeoffs

- Malformed CSV/header-level violations return `VALIDATION_ERROR` and fail the request early.
- Row-level validation failures do not abort the import; valid rows continue and final status becomes `completed_with_errors`.
- Import status summaries are persisted in `bulk_imports.result_summary` (JSON) instead of adding new columns in this phase, trading schema strictness for lower migration overhead.

## Honest Gaps After Phase 6

- No S3 upload flow or frontend auth/import screens yet.
- Audit coverage now includes auth, program, and session writes; future import/upload writes still need to call the shared helper.
- Bearer tokens are the only auth transport; cookie/session handling is deferred.
