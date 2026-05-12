# 03 — Phase 2 Auth

## Goal

Implement custom JWT authentication for Wellspring creators: signup, login, password reset request, password reset confirm, and current-user lookup.

## Original Codex Prompt

Implemented from the approved Phase 2 auth plan for Express API auth only.

## Codex Plan

- Add custom JWT auth endpoints to `apps/api`.
- Keep tenant-owned tables on the existing RLS + `withTenantContext` model.
- Treat `public.creators` as a narrow pre-tenant auth identity table with deliberate runtime-role grants.
- Add one private DB function to consume password reset tokens and update creator passwords atomically.
- Add auth middleware, request validation, seeded password hashing, and integration tests.

## What Changed

- Added auth dependencies: `bcryptjs`, `jsonwebtoken`, and `@types/jsonwebtoken`.
- Added auth modules for creator access, password hashing, JWT signing/verification, password reset, and creator response sanitization.
- Added `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/password-reset/request`, `POST /api/auth/password-reset/confirm`, and `GET /api/auth/me`.
- Added runtime-role grants on `public.creators` and the private `app.consume_password_reset_token(...)` migration.
- Added auth env validation, Bearer token middleware, and auth integration tests.
- Updated the seed flow to hash real creator passwords.

## Verification Run

- `npm run db:migrate`
- `npm run db:seed`
- `npm run test`
- `npm run build`

## Notes

- Supabase Auth is still not used.
- `public.creators` remains the only pre-tenant auth table accessible to the runtime role.
- Password changes do not revoke existing JWTs in this phase.
- Frontend auth screens remain out of scope for Phase 2.
