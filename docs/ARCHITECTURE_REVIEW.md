# Architecture Review

## What Was Built

Wellspring ships as a multi-tenant content management system for wellness creators with a clear split between frontend, API, and database responsibilities. The Next.js admin panel in `apps/web` handles creator-facing workflows such as signup, login, program management, ordered session management, CSV import, S3 media upload, and audit log review. The Express + TypeScript API in `apps/api` owns all application data access, request validation, auth, and tenant-aware orchestration. Supabase is used only as hosted PostgreSQL; there is no Supabase Auth, no Supabase Storage, and no frontend database access.

The built feature set covers the required product surface: custom JWT auth, password reset, program CRUD, session CRUD and reorder, idempotent CSV import with row-level feedback, S3 pre-signed upload URLs, audit logging for admin writes, and a functional admin panel that exercises those flows. The repository also includes raw SQL migrations, deterministic seed data, runtime/admin DB role separation, structured request logs, and tenant isolation tests. That combination is more important than any single endpoint because the product goal was a production-minded implementation, not a collection of disconnected features.

## What Was Skipped

Several common platform features were deliberately excluded. There is no public creator storefront, no billing, no team support, no advanced RBAC, no background job layer, no multipart upload flow, and no media transcoding. The frontend does not use server actions or a direct database client, and the backend does not use an ORM. Those omissions are intentional scope control decisions, not unfinished accidental gaps.

## Tenant Isolation Strategy

Tenant isolation is enforced at the data layer rather than at the controller layer. Every tenant-owned table includes `creator_id`, and application queries run through the restricted `wellspring_app` runtime role instead of the Supabase `postgres` role. Tenant-scoped work is executed inside `withTenantContext(creatorId, ...)`, which sets `SET LOCAL app.current_creator_id` for the current transaction before repositories issue SQL. RLS policies and `FORCE ROW LEVEL SECURITY` then use that context to decide whether rows are visible or writable.

This design matters because it prevents subtle application bugs from turning into cross-tenant data exposure. A handler can still make a mistake in which repository method it calls, but it cannot simply inject another creator's id into a WHERE clause and bypass security if the runtime role is restricted correctly. The test suite explicitly exercises that guarantee with cross-tenant program and session access checks, forged `creator_id` attempts, and tenant-scoped audit retrieval. The tradeoff is additional SQL and migration complexity, but for this product that complexity is the right place to spend effort.

## Database And API Shape

The API uses explicit `pg` queries and handwritten SQL migrations rather than an ORM. That choice keeps grants, roles, composite foreign keys, RLS policies, and write ordering behavior visible in code review. It also matches the project's strongest correctness requirements: tenant isolation, exact reorder semantics, idempotency constraints, and audit logging are easier to reason about when the SQL is explicit. The downside is more repository code and fewer abstractions for repetitive CRUD, but the domain is still small enough that the clarity is worth it.

The API follows a repository-service-presenter split. Repositories own SQL, services own orchestration and error mapping, and route files stay thin with Zod validation and auth middleware. That keeps HTTP concerns out of SQL modules and makes it easier to test domain behavior without a browser. It is not a highly abstracted architecture, but it is coherent and easy to trace end to end.

## Bulk Import Idempotency

CSV import idempotency is one of the more important product guarantees because duplicate sessions are costly for creators and easy to introduce with network retries. The API requires a client-provided `clientImportId`, and the database enforces `unique (creator_id, client_import_id)` on `bulk_imports`. On the first request, the import transaction persists the import row, validates and processes each CSV row, inserts valid sessions, stores row-level feedback, and writes the summary result. On a retry with the same key for the same creator, the API returns the previously persisted import record and row feedback with `replayed: true` instead of inserting anything again.

That behavior is database-backed rather than session-backed, which is the correct choice here. It survives API restarts, browser refreshes, and repeated form submits. The frontend now exposes the key as an `Idempotency key`, keeps it stable after submit, and shows a visible replay notice so reviewers and creators can verify the contract directly instead of trusting hidden mechanics.

## S3 Upload Flow Security

Session media uploads do not pass through the Express server. Instead, an authenticated creator asks the API for a short-lived PUT URL, and the browser uploads directly to S3 using that URL. The API validates filename shape, content type, and maximum content length before signing. It also generates the object key server-side under `creators/{creatorId}/session-media/{uuid}.{ext}`, so the client never chooses an arbitrary bucket path.

This is a reasonable security posture for the current product phase. AWS credentials stay on the server, pre-signed URLs expire quickly, and the signed request is bound to the configured bucket, key, and content type. The main operational caveat is that bucket CORS must be configured correctly or the browser upload will fail even when the API behaves correctly. That is documented in the README because it is an integration risk reviewers are likely to hit.

## Frontend Auth Tradeoff

The frontend uses `localStorage` to persist the Bearer token and calls `GET /api/auth/me` on boot to validate it. That approach is simple and worked well for a client-rendered admin panel that needed to be built quickly without adding cookie infrastructure to the API. It also keeps the frontend thin because all application data still comes from the existing REST API.

The tradeoff is real: `localStorage` is weaker than `httpOnly` cookies against XSS and provides no natural CSRF boundary. It also means protected routes are enforced in client components rather than trusted server components, because the token is not available to the server in a safer transport. I am comfortable with this tradeoff for the current phase because the goal was functional admin coverage, but it would not be my preferred long-term auth transport.

## Parts I Am Less Confident In

The core tenant isolation, import idempotency, and API test coverage are the parts I trust most because they are backed by explicit database constraints and repeatable tests. The parts I trust less are the browser-edge pieces that depend on environment correctness: S3 bucket CORS, direct upload behavior across browsers, and the development-only password reset flow that surfaces a debug reset URL instead of sending email. The frontend also does not yet have its own dedicated automated test harness, so confidence there comes from build verification and manual smoke testing rather than component-level regression tests.

I am also less confident in the current auth hardening story. Password reset works and writes audit entries, but existing JWTs are not revoked after a password change. That is acceptable for the current phase, but it is still a real limitation.

## What I Would Change With Two More Days

The first change would be auth hardening: move from `localStorage` Bearer tokens to `httpOnly` cookies with explicit session rotation and clearer logout semantics. The second would be adding focused browser automation for the highest-value admin flows, especially direct S3 upload, CSV import replay, and password reset. The third would be operational polish around uploads, such as progress reporting, stronger bucket policy guidance, and possibly multipart upload support for larger media files.

I would also consider a small amount of internal cleanup rather than feature expansion. The frontend could benefit from a light query-state abstraction for repeated loading/error patterns, and the API could centralize some repeated pagination and presenter code without changing architecture. I would not spend those two days adding new product surfaces; the better use of time is to harden the parts that already matter.

## Overall Assessment

The implementation is intentionally narrow but coherent. The backend architecture prioritizes explicit tenant boundaries, predictable SQL behavior, and auditable write flows. The frontend stays simple and functional, which matches the phase goals and avoids introducing a second layer of avoidable complexity. The remaining weaknesses are mostly around hardening and automation, not around missing core requirements.
