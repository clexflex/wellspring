# 04 — Phase 3 Audit Logging

## Goal

Implement reusable audit log infrastructure, tenant-scoped audit log retrieval, and request-log cleanup for Wellspring.

## Original Codex Prompt

Phase 3 focused on:
- reusable audit log writes through the existing runtime role and tenant context
- `GET /api/audit-logs` with auth, filters, and pagination
- preserving Phase 1 tenant isolation guarantees
- fixing duplicated/conflicting structured request log metadata

## Codex Plan

Approved implementation shape:
- add `apps/api/src/audit/*` for action constants, audit writes, audit reads, cursor helpers, and route-facing service logic
- keep `audit_logs` on RLS + `withTenantContext(...)`
- wire current auth write flows to record:
  - `CREATOR_SIGNED_UP`
  - `PASSWORD_RESET_REQUESTED`
  - `PASSWORD_RESET_CONFIRMED`
- add `GET /api/audit-logs` with filters for `from`, `to`, `action`, plus cursor pagination
- fix the logger so each request emits one canonical top-level payload with `request_id`, `tenant_id`, `method`, `path`, and `status_code`
- add migration support for cursor-friendly audit indexes and update `app.consume_password_reset_token(...)` to return `creator_id`

## My Review

What I approved:
- cursor pagination instead of offset pagination
- keeping `audit_logs.action` as `text` with shared TypeScript constants instead of adding a PostgreSQL enum
- changing the password reset consume function to return `creator_id` so password reset confirmation can audit in the same transaction

What I questioned:
- whether the logger needed to stay on `pino-http`
- whether auth write flows should start emitting audit rows now instead of waiting for later CRUD phases

What I changed manually:
- nothing in this phase

Bugs or issues found:
- the first migration attempt failed because PostgreSQL does not allow changing a function return type with `create or replace`; the fix was to drop and recreate `app.consume_password_reset_token(...)`
- the original request logger shape duplicated top-level request metadata and could report conflicting paths because it relied on mutable `req.url` inside mounted routes
