# Wellspring

Wellspring is a multi-tenant content management platform for wellness creators.

Phases 1 through 5 establish the backend foundation, custom creator authentication, audit log infrastructure, tenant-safe program CRUD, and session CRUD with reorder:
- Express + TypeScript API in `apps/api`
- PostgreSQL schema managed through Supabase SQL migrations
- split admin/runtime database roles
- RLS-based tenant isolation with transaction-local tenant context
- custom JWT auth for creators
- tenant-scoped audit logging and retrieval
- tenant-safe program CRUD
- tenant-safe session CRUD and reorder
- deterministic seed data

## Tech Stack

- Next.js
- Node.js + Express
- TypeScript
- PostgreSQL hosted on Supabase
- Tailwind CSS
- shadcn/ui

## Repository Structure

- `apps/web` Next.js admin panel
- `apps/api` Express API
- `packages/shared` shared package placeholder
- `supabase` SQL migrations and role definitions
- `docs` project documentation
- `ai-history` AI development history

## Environment Setup

1. Copy `.env.example` values into `.env.local`.
2. Set `DATABASE_ADMIN_URL` to the Supabase `postgres` connection.
3. Set `DATABASE_URL` to the restricted runtime role connection for `wellspring_app`.
4. Set `JWT_SECRET`, `JWT_EXPIRES_IN`, and `PASSWORD_RESET_TOKEN_EXPIRES_MINUTES`.
5. Keep `.env.local` private and untracked.

## Commands

- `npm run dev` starts the web app and API together.
- `npm run dev:web` starts the Next.js app.
- `npm run dev:api` starts the Express API with `tsx watch`.
- `npm run build` builds `apps/web` and `apps/api`.
- `npm run test` runs the API test suite, including auth and tenant-isolation integration tests.
- `npm run db:migrate` pushes SQL migrations to Supabase and bootstraps the runtime DB role password.
- `npm run db:seed` seeds 2 creators, 3 programs per creator, and about 10 sessions per program.

## API Surface

- `GET /health` returns `{ "status": "ok" }`.
- `POST /api/auth/signup` creates a creator and returns `{ creator, token }`.
- `POST /api/auth/login` returns `{ creator, token }` for valid credentials.
- `POST /api/auth/password-reset/request` always returns success and, in non-production, includes a debug reset token and URL.
- `POST /api/auth/password-reset/confirm` consumes a reset token and updates the password.
- `GET /api/auth/me` returns the authenticated creator profile from a Bearer token.
- `GET /api/audit-logs` returns tenant-scoped audit logs with optional `from`, `to`, `action`, `limit`, and `cursor` query params.
- `GET /api/programs` returns tenant-scoped programs with `limit` and `offset` pagination.
- `POST /api/programs` creates a program for the authenticated creator.
- `GET /api/programs/:programId` returns one tenant-owned program.
- `PATCH /api/programs/:programId` updates one tenant-owned program.
- `DELETE /api/programs/:programId` deletes one tenant-owned program.
- `GET /api/programs/:programId/sessions` returns tenant-scoped sessions for a program.
- `POST /api/programs/:programId/sessions` creates a session in a tenant-owned program.
- `GET /api/sessions/:sessionId` returns one tenant-owned session.
- `PATCH /api/sessions/:sessionId` updates one tenant-owned session.
- `DELETE /api/sessions/:sessionId` deletes one tenant-owned session.
- `POST /api/programs/:programId/sessions/reorder` atomically reorders all sessions in a program.

## Auth Notes

- Supabase Auth is not used.
- Cookies are deferred; API auth uses `Authorization: Bearer <token>`.
- `public.creators` is treated as a narrow auth identity table for signup/login/me.
- Tenant-owned content tables remain protected by RLS and `withTenantContext(...)`.
- Password reset confirmation uses a private database function to consume the token and update the password atomically.
- Existing JWTs are not revoked when a password changes in this phase.
- Signup and password-reset write flows now record audit entries through the runtime role inside tenant-aware transactions.

## Audit Log Notes

- `GET /api/audit-logs` requires `Authorization: Bearer <token>`.
- Audit logs are ordered by `created_at desc, id desc`.
- Supported filters:
  - `from`
  - `to`
  - `action`
- Pagination uses opaque cursors:
  - `limit` defaults to `25`
  - `limit` max is `100`
  - response shape is `{ items, pageInfo }`
- Current auth-triggered actions:
  - `CREATOR_SIGNED_UP`
  - `PASSWORD_RESET_REQUESTED`
  - `PASSWORD_RESET_CONFIRMED`

## Program API Notes

- All program endpoints require `Authorization: Bearer <token>`.
- Program list ordering is `updated_at desc, id desc`.
- Program list pagination uses:
  - `limit` default `25`, max `100`
  - `offset` default `0`
- Request bodies must not include `creator_id`; those requests are rejected with `VALIDATION_ERROR`.
- Cross-tenant or missing program access returns `404`.
- Program write actions record audit rows:
  - `PROGRAM_CREATED`
  - `PROGRAM_UPDATED`
  - `PROGRAM_DELETED`
- Program deletion follows the existing schema behavior and cascade-deletes that program's sessions.

## Session API Notes

- All session endpoints require `Authorization: Bearer <token>`.
- Session list ordering is `position asc, created_at asc, id asc`.
- Session list pagination is intentionally omitted in this phase.
- Session request bodies must not include `creator_id`; those requests are rejected with `VALIDATION_ERROR`.
- Cross-tenant or missing program/session access returns `404`.
- Session writes record audit rows:
  - `SESSION_CREATED`
  - `SESSION_UPDATED`
  - `SESSION_DELETED`
  - `SESSIONS_REORDERED`
- Create behavior:
  - omitted `position` appends to the end of the program
  - provided `position` shifts existing sessions upward to keep positions contiguous
- Delete behavior renumbers later sessions downward to keep positions contiguous.
- Reorder requires the submitted `sessionIds` to exactly match the program's current sessions and applies contiguous 1-based positions atomically.

## Seeded Dev Credentials

After `npm run db:seed`:
- `ava@wellspring.local` / `Wellspring123!`
- `milo@wellspring.local` / `Wellspring123!`

## Notes

- Supabase is used as hosted PostgreSQL only.
- Supabase Storage is not used for application features.
- The frontend must not query application tables directly.
- CSV import, uploads, and frontend auth screens are deferred to later phases.
