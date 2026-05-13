# Wellspring

Loom walkthrough URL: `https://www.loom.com/share/79c038e83a6a45e89dc49d84032d09ef`

Wellspring is a multi-tenant content management platform for wellness creators. Creators use the admin panel to manage programs, ordered audio or video sessions, CSV imports, session media uploads, and tenant-scoped audit history. The implementation uses a Next.js admin panel over an Express + TypeScript API, with Supabase used only as hosted PostgreSQL.

## Product Summary

What is in scope today:
- creator signup, login, and password reset
- tenant-safe program CRUD
- tenant-safe session CRUD and reorder
- idempotent CSV session import with row-level feedback
- S3 pre-signed upload URL flow for session media
- audit logging for admin write actions and audit log review UI
- Next.js admin panel backed only by the Express API

What is intentionally out of scope:
- Supabase Auth
- Supabase Storage
- direct frontend database access
- billing, teams, advanced RBAC, public storefronts, background workers, and media transcoding

## Tech Stack

- Next.js 16 App Router in `apps/web`
- Express + TypeScript API in `apps/api`
- PostgreSQL hosted on Supabase
- raw SQL migrations in `supabase/migrations`
- Tailwind CSS and local shadcn-style UI primitives
- AWS S3 pre-signed PUT uploads for media

## Repository Structure

- `apps/web`: admin panel
- `apps/api`: Express API, runtime DB access, seed scripts, tests
- `packages/shared`: reserved workspace package
- `supabase`: SQL migrations and role setup
- `docs`: architecture and code summary docs
- `ai-history`: chronological AI work log

## Setup

1. Install dependencies.

```bash
npm install
```

2. Copy `.env.example` to `.env.local`.

```bash
cp .env.example .env.local
```

3. Fill in `.env.local` with your Supabase Postgres connection strings, JWT secret, and AWS S3 configuration.
4. Run database migrations.
5. Seed the development database.
6. Start the web app and API.

## Environment Variables

Required application variables are documented in `.env.example`.

Important values:
- `APP_ORIGIN`: browser origin allowed by API CORS, usually `http://localhost:3000`
- `NEXT_PUBLIC_API_BASE_URL`: browser base URL for the Express API, usually `http://localhost:4000`
- `DATABASE_ADMIN_URL`: privileged Supabase Postgres connection used for migrations and seed
- `DATABASE_URL`: restricted runtime connection for `wellspring_app`
- `JWT_SECRET`: long random secret for creator JWTs
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`: server-side AWS credentials used only by the API
- `AWS_S3_BUCKET` and `S3_PUBLIC_BASE_URL`: S3 bucket name and public base URL for uploaded media

Keep `.env.local` untracked. `.env.example` must remain placeholder-only.

## Database Migrations

Apply migrations and sync the runtime role password:

```bash
npm run db:migrate
```

This command pushes the SQL migrations in `supabase/migrations`, applies role definitions, and runs the API bootstrap script that aligns the `wellspring_app` role password with `DATABASE_URL`.

## Seed Data

Seed deterministic development data:

```bash
npm run db:seed
```

The seed creates:
- 2 creators
- 3 programs per creator
- 10 sessions per program

Seeded credentials after `npm run db:seed`:
- `ava@wellspring.local` / `Wellspring123!`
- `milo@wellspring.local` / `Wellspring123!`

## Development

Run both apps together:

```bash
npm run dev
```

Run apps separately:

```bash
npm run dev:web
npm run dev:api
```

Default local URLs:
- web: `http://localhost:3000`
- API: `http://localhost:4000`

## Testing

Run the backend test suite:

```bash
npm run test
```

The suite covers auth flows, tenant isolation, audit behavior, program/session CRUD, session reorder, CSV import idempotency, uploads pre-signing, and request logging.

## Build

Build both applications:

```bash
npm run build
```

Frontend-only build:

```bash
npm run build:web
```

## Main API Capabilities

Auth:
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/password-reset/request`
- `POST /api/auth/password-reset/confirm`
- `GET /api/auth/me`

Programs:
- `GET /api/programs`
- `POST /api/programs`
- `GET /api/programs/:programId`
- `PATCH /api/programs/:programId`
- `DELETE /api/programs/:programId`

Sessions:
- `GET /api/programs/:programId/sessions`
- `POST /api/programs/:programId/sessions`
- `GET /api/sessions/:sessionId`
- `PATCH /api/sessions/:sessionId`
- `DELETE /api/sessions/:sessionId`
- `POST /api/programs/:programId/sessions/reorder`

CSV import:
- `POST /api/programs/:programId/sessions/import`

Uploads:
- `POST /api/uploads/session-media/presign`

Audit:
- `GET /api/audit-logs`

## Admin Panel Routes

Public routes:
- `/login`
- `/signup`
- `/forgot-password`
- `/reset-password?token=...`

Protected routes:
- `/programs`
- `/programs/new`
- `/programs/[programId]/edit`
- `/programs/[programId]/sessions`
- `/programs/[programId]/sessions/new`
- `/programs/[programId]/sessions/import`
- `/sessions/[sessionId]/edit`
- `/audit-logs`

## Frontend Notes

- The frontend calls the Express API only. It does not call Supabase tables directly.
- Auth is currently stored as a Bearer JWT in `localStorage` and attached to API requests.
- Protected routes are enforced in the client because the token is not stored in `httpOnly` cookies.
- `httpOnly` cookie auth would be a stronger production hardening step than the current Phase 8 transport.

## CSV Import Idempotency Notes

The session import UI exposes `clientImportId` as an `Idempotency key`.
- Reusing the same key replays the previous import result and does not create duplicate sessions.
- Generating a new key creates a new import attempt and can create duplicate sessions if the CSV rows are still valid.
- The import screen keeps the latest result visible so replay behavior is obvious.

## S3 Upload Notes

- The API validates upload metadata before signing a PUT URL.
- Object keys are always server-generated and tenant-scoped: `creators/{creatorId}/session-media/{uuid}.{ext}`.
- The browser uploads directly to S3 using the returned pre-signed URL; the file bytes do not pass through the Express API.
- AWS credentials never reach the frontend.

S3 bucket CORS must allow browser PUT requests from your frontend origin. A typical local-development bucket CORS rule must allow:
- origin: `http://localhost:3000`
- method: `PUT`
- request headers including `Content-Type`

If pre-signing succeeds but the browser upload fails, check bucket-side CORS before changing application code.

## Security And Tenant Isolation Notes

- Supabase is used only as hosted PostgreSQL.
- Tenant-owned tables include `creator_id` and are protected by RLS and `FORCE ROW LEVEL SECURITY`.
- Application queries run through a restricted runtime role inside `withTenantContext(creatorId, ...)` transactions that set `app.current_creator_id`.
- Cross-tenant access returns `404` rather than leaking whether another tenant's row exists.

## Manual QA Checklist

- signup creates a new creator and lands on `/programs`
- logout clears the session and redirects to `/login`
- login with seeded credentials reaches the protected shell
- forgot-password returns a debug reset URL in development
- reset-password accepts a valid token and allows a fresh login
- program create, edit, and delete work for the signed-in creator
- session create, edit, delete, and reorder work within one program
- session media upload pre-sign returns a URL and direct S3 upload succeeds
- CSV import accepts valid rows, shows failed rows, and preserves the import result
- replaying the same CSV with the same idempotency key returns `replayed: true`
- reusing the same CSV with a new idempotency key creates a new import attempt
- audit logs show recent write actions and filter correctly by action and date

## Loom Walkthrough Outline

1. Product overview and architecture boundaries
2. Environment setup and key commands
3. Seeded login and protected admin shell
4. Program CRUD
5. Session CRUD and reorder
6. CSV import with idempotency replay
7. S3 media upload pre-sign flow
8. Audit log filters and pagination
9. Tenant isolation and test coverage summary
10. Known tradeoffs and next hardening steps
