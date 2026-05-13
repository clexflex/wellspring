# 06 — Phase 5 Session CRUD and Reorder

## Goal

Implement tenant-safe session CRUD and session reorder within programs for Wellspring.

## Original Codex Prompt

Phase 5 focused on:
- authenticated REST CRUD for `sessions`
- list/create/reorder under a parent program
- strict tenant isolation through the existing runtime role, RLS, and `withTenantContext(...)`
- same-transaction audit logging for create, update, delete, and reorder
- safe position management under the existing uniqueness constraint

## Codex Plan

Approved implementation shape:
- add a session module under `apps/api/src/sessions/*` for explicit SQL, route-facing orchestration, and presenters
- add six endpoints covering list/create/get/update/delete/reorder
- add a migration for missing session metadata columns:
  - `duration_seconds`
  - `instructor_name`
  - `tags`
  - `media_url`
  - `media_type`
- keep position values contiguous on create and delete
- validate reorder by exact session-id set matching for the target program
- use a two-phase temporary-position strategy to avoid collisions with `unique (creator_id, program_id, position)`
- keep all reads and writes on the restricted runtime role under tenant context

## My Review

What I approved:
- adding the missing session metadata columns now instead of limiting the phase to the original narrow schema
- contiguous position handling instead of allowing gaps
- exact-set reorder validation instead of partial reorder payloads

What I questioned:
- whether temporary negative positions were still viable once the `position > 0` check constraint was confirmed
- whether direct `position` patch support should be deferred in favor of the dedicated reorder endpoint

What I changed manually:
- nothing in this phase

Bugs or issues found:
- the originally proposed temporary negative position strategy conflicts with the existing `sessions_position_positive` check, so the implementation had to use a temporary high-positive-offset approach instead
- the first migration file timestamp was earlier than the latest applied migration, so it had to be renamed before `supabase db push` would accept it
