# Code Summary

## Auth

The custom auth stack lives in `apps/api/src/auth/*` and deliberately avoids Supabase Auth. `creator-repository.ts` is the only runtime-role path that talks directly to `public.creators`, which keeps pre-tenant auth concerns narrow and auditable. `service.ts` owns signup, login, password reset request, password reset confirmation, and current-creator lookup, while `jwt.ts` and `passwords.ts` isolate token signing and bcrypt concerns. The route layer in `src/http/routes/auth.ts` stays thin and delegates validation and orchestration into the auth service. The frontend auth layer in `apps/web/src/components/auth/*` and `apps/web/src/lib/auth/*` mirrors that separation by keeping token persistence, bootstrapping, and form submission logic out of the page files.

## Database And Tenant Enforcement

Database access is split between an admin connection and a restricted runtime connection in `apps/api/src/db/*`. The core safety mechanism is `withTenantContext(creatorId, ...)`, which starts a transaction and sets `SET LOCAL app.current_creator_id` before any tenant-scoped SQL runs. Row Level Security and `FORCE ROW LEVEL SECURITY` on tenant-owned tables make that context meaningful at the database layer rather than relying on controller discipline. Composite tenant-aware foreign keys and explicit repository SQL reduce the chance of cross-tenant joins being assembled incorrectly. Migrations live under `supabase/migrations`, and the runtime role definition is kept in `supabase/roles.sql` so schema and permission changes stay reviewable.

## Audit Logging

Audit logging is treated as a first-class subsystem, not an afterthought. `apps/api/src/audit/record.ts` inserts audit rows using the same runtime client and transaction as the write it describes, which prevents “write succeeded but audit failed later” drift. `repository.ts`, `service.ts`, and `presenters.ts` handle tenant-scoped retrieval, action/date filters, and cursor pagination over `(created_at, id)`. The frontend audit viewer in `apps/web/src/components/audit/*` stays close to the API contract and renders metadata as readable JSON instead of inventing a second derived model. This keeps audit behavior explicit, tenant-safe, and relatively easy to extend when new write actions are added.

## Programs

Program CRUD lives in `apps/api/src/programs/*` and follows the same repository-service-presenter pattern as the other domain modules. The repository keeps SQL explicit for list, create, read, update, and delete operations, while the service layer owns 404 behavior, validation boundaries, and audit writes. Because every program operation runs inside tenant context, forged `creator_id` values are ignored or rejected instead of trusted. On the frontend, `apps/web/src/components/programs/*` provides shared list and form components so the pages under `apps/web/src/app/(protected)/programs/*` remain mostly responsible for load and navigation state. The result is a straightforward CRUD path with clear tenant boundaries and low hidden behavior.

## Sessions

Session management is more involved because it has to preserve ordered positions inside each program. `apps/api/src/sessions/repository.ts` owns the SQL that appends, inserts, shifts, deletes, renumbers, and reorders positions while keeping them contiguous. `service.ts` validates parent program ownership, maps cross-tenant access to `404`, and records session-related audit events inside the same transaction. The frontend session pages and components in `apps/web/src/components/sessions/*` expose create, edit, delete, reorder, and media URL editing without introducing drag-and-drop complexity. The reorder UI intentionally uses explicit arrow controls so the submitted `sessionIds` order is always obvious and easy to verify against the API contract.

## Imports

CSV import logic lives in `apps/api/src/imports/*`, with `csv-parser.ts` responsible for strict headers, per-row normalization, and row-number-aware validation feedback. `repository.ts` persists both the top-level import record and every row result so retries can replay the exact previous outcome instead of recomputing a best effort approximation. The unique `(creator_id, client_import_id)` constraint makes idempotency a database guarantee rather than a convention in application memory. In the frontend, `apps/web/src/components/imports/session-import-form.tsx` exposes the idempotency key directly, keeps the latest result visible, and makes replay behavior visible when `replayed` is true. That UI choice is important because idempotency is only trustworthy when creators can understand and intentionally test it.

## Uploads

Session media uploads use a direct-to-S3 pre-sign flow in `apps/api/src/uploads/*`. The API validates filename shape, media content type, and size before creating a short-lived PUT URL, and the object key is always generated server-side under `creators/{creatorId}/session-media/...`. `s3-client.ts` isolates AWS SDK usage so signing behavior is not spread through route handlers. The frontend upload helper in `apps/web/src/lib/uploads/upload-session-media.ts` performs the second half of the flow by uploading the file directly to S3 and then writing the returned `publicUrl` into the session form. This keeps large file transfer out of the Express process while still preserving tenant scoping and auditability.

## Frontend Admin Panel

The admin panel lives in `apps/web` and is intentionally a thin client over the Express API. `src/lib/api/client.ts` centralizes `NEXT_PUBLIC_API_BASE_URL`, Bearer token attachment, structured API error parsing, and `401` invalidation so page components do not duplicate fetch logic. `src/components/auth/auth-provider.tsx` reads the saved token from `localStorage`, validates it with `GET /api/auth/me`, and exposes the current creator to protected layouts. Route groups under `src/app/(auth)` and `src/app/(protected)` separate public auth screens from the authenticated app shell without inventing a heavier frontend architecture. The UI stays functional rather than ornate, but it covers the required flows end to end: auth, programs, sessions, uploads, imports, and audit review.

## Scripts, Seeds, And Tests

Operational scripts live in `apps/api/src/scripts/*` and at the root `package.json`. `seed-data.ts` intentionally creates deterministic creators, programs, and sessions so reviewers can log in immediately and validate tenant-scoped behavior without extra setup work. The test suite in `apps/api/src/__tests__` and related helpers in `src/db/test-helpers.ts` focuses on the backend guarantees that matter most: tenant isolation, auth correctness, idempotent imports, upload signing, and audit trails. Root scripts (`db:migrate`, `db:seed`, `test`, `build`) make the repository reviewable from a small command surface instead of requiring reviewers to discover per-package steps. That matters for final packaging because the project should be understandable as an application, not just as a set of source files.
