# 07 — Phase 6 CSV Import and Idempotency

## Goal

Implement tenant-safe bulk CSV session import with row-level validation feedback and idempotent retry behavior.

## Original Codex Prompt

Phase 6 focused on:
- `POST /api/programs/:programId/sessions/import` under existing JWT auth
- strict tenant scoping with `withTenantContext(...)` and runtime DB role only
- idempotency by DB constraint `unique (creator_id, client_import_id)`
- persisted row-level feedback for inserted and failed rows
- same-transaction `SESSIONS_IMPORTED` audit logging
- no frontend screens and no S3 upload work in this phase

## Codex Plan

Approved implementation shape:
- add a dedicated imports module under `apps/api/src/imports/*`:
  - CSV parsing/validation
  - repository SQL for import lifecycle and row persistence
  - service orchestration and presenters
- add route + schema pair under `apps/api/src/http/routes/imports.ts` and `apps/api/src/http/schemas/imports.ts`
- wire route into `app.ts` under `/api`
- no migration in Phase 6:
  - keep existing `bulk_imports.result_summary` and `bulk_import_rows.payload` JSON storage
- CSV contract decisions:
  - unknown headers reject whole request
  - disallow `creator_id`/`program_id` headers
  - pipe-delimited `tags`
  - allow `position` header but ignore values; append imported sessions in CSV order
- idempotency/replay behavior:
  - first request inserts and processes import
  - retry returns persisted result with `replayed: true`
  - duplicate inserts prevented by DB uniqueness

## My Review

What I approved:
- strict header contract with fail-fast behavior for unknown/disallowed headers
- replay semantics returning persisted results instead of reprocessing
- JSON-backed row payload persistence (no migration)

What I questioned:
- whether header-level CSV validation failures should persist a failed import row or fail request immediately
- how to keep replay response stable if payload schema evolves later

What I changed manually:
- nothing in this phase

Bugs or issues found:
- local test run in this environment failed with `ECONNREFUSED` to `127.0.0.1:5432`, so runtime integration tests could not be executed here
