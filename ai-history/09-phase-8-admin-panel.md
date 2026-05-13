# 09 — Phase 8 Admin Panel

## Goal

Build the functional Next.js admin panel for Wellspring.

## Original Codex Prompt

Implement the Phase 8 Next.js admin panel for Wellspring using the existing Express API only.

Scope included:
- signup, login, forgot-password, reset-password
- protected app shell
- program CRUD
- session CRUD
- session reorder
- direct-to-S3 media upload through the pre-sign endpoint
- CSV import with idempotency key and row feedback
- audit log viewer with action/date filters
- minimal backend change for browser CORS

## Codex Plan

Approved implementation plan summary:
- add a typed frontend API client around `NEXT_PUBLIC_API_BASE_URL`
- store JWT in `localStorage`
- bootstrap auth with `GET /api/auth/me`
- guard protected routes in client components
- build functional pages under App Router route groups
- keep fetches client-side because auth is not cookie-based
- add minimal API CORS support using `APP_ORIGIN`
- verify with backend tests, Next.js build, root build, and browser smoke tests where practical

## My Review

What I approved:
- include password reset UI in Phase 8 so frontend coverage matches product requirements
- use up/down session reorder controls instead of drag-and-drop
- keep the UI functional and narrow
- allow the CORS-only backend change needed for browser integration

What I questioned:
- whether password reset should be in Phase 8 even though it was omitted from the narrower screen list

What I changed manually:
- none recorded in this file

Bugs or issues found:
- API lacked CORS middleware before frontend hookup
- S3 direct PUT still depends on bucket-side CORS being configured correctly
