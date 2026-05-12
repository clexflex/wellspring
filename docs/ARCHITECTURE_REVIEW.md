# Architecture Review

## Phase 1 and 2 Decisions

- The API talks to PostgreSQL through `pg` directly instead of an ORM.
- Schema changes are migration-managed SQL under `supabase/migrations`.
- Tenant isolation is enforced at the data layer through RLS, composite tenant-aware foreign keys, and a transaction-local tenant context.
- Database access is split between an admin role for migrations/seed and a restricted runtime role for application queries.
- Creator authentication is custom JWT auth implemented in the Express API.

## Why This Shape

- Raw SQL makes role setup, grants, RLS policies, and composite foreign keys explicit.
- A restricted runtime role means the application cannot silently bypass RLS by connecting as `postgres`.
- `withTenantContext` keeps tenant scoping close to the transaction boundary instead of trusting controller input.
- `public.creators` is handled as a narrow auth identity table because signup and login must work before a tenant context exists.

## Auth Tradeoffs

- The runtime role has limited direct access to `public.creators` for `SELECT`, `INSERT`, and password-hash updates only.
- Tenant-owned content tables remain on RLS + `withTenantContext`; auth does not weaken those protections.
- Password reset confirmation uses a private `app.consume_password_reset_token(...)` function because the token must be consumed safely before a tenant context can be established.
- Existing JWTs are not revoked on password change in this phase.

## Honest Gaps After Phase 2

- No program/session CRUD endpoints yet.
- No CSV import, S3 upload flow, or frontend auth screens yet.
- Audit log writes are still not wired because write endpoints remain out of scope so far.
- Bearer tokens are the only auth transport; cookie/session handling is deferred.
