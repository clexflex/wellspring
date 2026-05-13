# 05 — Phase 4 Program CRUD

## Goal

Implement tenant-safe program CRUD for Wellspring.

## Original Codex Prompt

Phase 4 focused on:
- authenticated REST CRUD for `programs`
- strict tenant isolation through the existing runtime role, RLS, and `withTenantContext(...)`
- same-transaction audit logging for create, update, and delete
- preserving the existing auth and audit patterns without introducing an ORM or frontend work

## Codex Plan

Approved implementation shape:
- add `apps/api/src/programs/*` for explicit SQL, route-facing service logic, and presenters
- add `GET`, `POST`, `GET by id`, `PATCH`, and `DELETE` routes under `/api/programs`
- keep list pagination simple with `limit + offset`
- reject `creator_id` in request bodies with `VALIDATION_ERROR`
- return `404` for missing or cross-tenant program access
- record `PROGRAM_CREATED`, `PROGRAM_UPDATED`, and `PROGRAM_DELETED` with the existing audit helper in the same runtime transaction/client
- do not add migrations because the existing schema and RLS are already sufficient
- use the schema's current delete behavior, which cascade-deletes sessions

## My Review

What I approved:
- offset pagination for Phase 4 instead of cursor pagination
- no title search in the initial program list endpoint
- keeping delete aligned with the existing cascade FK instead of introducing a conflicting API rule

What I questioned:
- whether delete should be blocked when sessions exist
- whether search should be included immediately or deferred

What I changed manually:
- nothing in this phase

Bugs or issues found:
- none during the approved implementation path
