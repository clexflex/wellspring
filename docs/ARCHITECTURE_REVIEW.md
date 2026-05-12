# Architecture Review

## Phase 1 Decisions

- The API talks to PostgreSQL through `pg` directly instead of an ORM.
- Schema changes are migration-managed SQL under `supabase/migrations`.
- Tenant isolation is enforced at the data layer through RLS, composite tenant-aware foreign keys, and a transaction-local tenant context.
- Database access is split between an admin role for migrations/seed and a restricted runtime role for application queries.

## Why This Shape

- Raw SQL makes role setup, RLS policies, grants, and composite foreign keys explicit.
- A restricted runtime role means the application cannot silently bypass RLS by connecting as `postgres`.
- `withTenantContext` keeps tenant scoping close to the transaction boundary instead of trusting controller input.

## Tradeoffs

- There is more handwritten SQL and more explicit connection management than an ORM-based stack.
- The `creators` table is intentionally not exposed through the runtime role yet because auth is deferred to a later phase.
- The runtime role bootstrap depends on admin access being allowed to create or alter custom roles in the hosted Supabase project.

## Honest Gaps After Phase 1

- No auth flows yet.
- No program/session CRUD endpoints yet.
- No CSV import, S3 upload flow, or frontend admin screens yet.
- Audit log writes are not wired yet because write endpoints are intentionally out of scope for this phase.
