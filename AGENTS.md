# AGENTS.md — Wellspring Build Rules

## Product Goal

Build Wellspring, a multi-tenant content management platform for wellness creators.

Creators use Wellspring to manage their own branded admin space, create programs, manage ordered audio/video sessions, upload media, import session data from CSV, and review administrative audit history.

The priority is a coherent, testable, production-minded implementation with strong tenant isolation, idempotent imports, audit logging, structured logs, migration-managed schema, and clear documentation.

## Engineering Standard

Treat this as a production application, not a prototype.

Optimize for:
- clear architecture
- explicit tenant boundaries
- testability
- readable code
- safe database access
- predictable error handling
- maintainable documentation

Do not optimize for generating the most code.

## Architecture Decisions

Use Supabase only as hosted PostgreSQL.

Do not use Supabase Auth.

Do not use Supabase Storage.

Use custom JWT auth in the Express API.

Use AWS S3 pre-signed upload URLs for media uploads.

The frontend must not call the database directly. All application data access goes through the Express API.

## Non-Negotiable Product Requirements

The implementation must include:

1. Node.js + Express + TypeScript backend.
2. PostgreSQL database hosted on Supabase.
3. Next.js admin panel.
4. Creator signup, login, and password reset.
5. Program CRUD.
6. Session CRUD.
7. Session reorder within a program.
8. Bulk CSV session import with row-level validation feedback.
9. Idempotent bulk import using a client-provided import ID.
10. S3 pre-signed upload URL flow for audio/video.
11. Audit log for every admin write action.
12. Audit log viewer with date and action filters.
13. Tenant isolation enforced at the data layer.
14. Tests proving tenant isolation.
15. Structured JSON logs with tenant_id and request_id.
16. Migration files.
17. Seed script creating 2 creators, 3 programs each, and about 10 sessions per program.
18. README with setup, run, test, and seed instructions.
19. .env.example.
20. docs/CODE_SUMMARY.md.
21. docs/ARCHITECTURE_REVIEW.md.
22. /ai-history folder containing AI session logs.

## Scope Control

Do not build features outside the product requirements until all required items are complete.

Avoid:
- public creator storefronts
- billing
- subscriptions
- teams
- complex role-based access control
- advanced media transcoding
- background workers
- Supabase Auth
- Supabase Storage
- consumer mobile APIs

## Tenant Isolation Rule

Tenant isolation must be enforced at the data layer.

Every tenant-owned table must include creator_id.

All tenant-scoped database access must run inside a transaction that sets the current creator context before queries run.

Use a helper similar to:

withTenantContext(creatorId, callback)

The helper must set a transaction-local database variable such as:

SET LOCAL app.current_creator_id = '<creator-id>'

RLS policies or equivalent database-layer checks must enforce that rows are visible and writable only when creator_id matches the current database tenant context.

Never trust creator_id from request bodies, query params, route params, or frontend state.

If the request includes creator_id, ignore it or reject it.

## Required Tenant Isolation Tests

There must be tests with names close to:

- rejects cross-tenant program access
- rejects cross-tenant program update
- rejects forged creator_id on program create

Add more tests for sessions and audit logs if time allows.

## Bulk Import Rule

Bulk imports must be idempotent.

The client sends clientImportId.

The database must enforce:

unique (creator_id, client_import_id)

If the same creator retries the same clientImportId, return the previous import result and do not insert duplicate sessions.

Row-level validation feedback must include row number, status, and error message.

## S3 Upload Rule

The API generates pre-signed upload URLs only for authenticated creators.

S3 object keys must be tenant-scoped:

creators/{creatorId}/session-media/{uuid}.{ext}

URLs must be time-limited.

Validate content type and size before generating the URL.

Allowed content types should be limited to common audio/video types.

Never expose AWS credentials to the frontend.

## Audit Log Rule

Every admin write action must create an audit log row.

Audit log rows must include:
- creator_id
- actor_creator_id
- action
- target_type
- target_id
- metadata
- created_at

Audit logs must also be tenant-isolated.

## Logging Rule

Use structured JSON logs.

Every request log must include:
- request_id
- tenant_id if authenticated, otherwise null
- method
- path
- status_code where available

Do not use console.log for request logs.

## API Style

Use REST.

Use Zod for request validation.

Use consistent error responses:

{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable message",
    "details": {}
  }
}

Do not leak whether another tenant's resource exists. Prefer 404 for cross-tenant resource access.

## Frontend Style

Keep the UI functional and simple.

Use shadcn/ui and Tailwind where useful.

Prioritize required flows over visual polish.

Use clear empty states and error messages.

## MCP and Tooling Context

The development environment has the following MCP servers available:

- Chrome MCP
- Next.js MCP
- Supabase MCP
- Playwright MCP
- Context7 MCP

Use these tools intentionally.

Use Context7 whenever implementing or modifying code that depends on current library APIs, framework conventions, or package-specific behavior.

Use the Next.js MCP when working on the admin panel.

Use the Supabase MCP when working with database schema, migrations, indexes, constraints, and RLS policies.

Use the Playwright MCP for browser-level verification of the admin panel.

Use Chrome MCP for live browser inspection, network debugging, cookies, redirects, and UI behavior.

Do not use MCPs to expand product scope.

## Scope Guardrail for MCP Usage

If an MCP suggests a more advanced pattern, only use it when it directly supports the current phase acceptance criteria.

Examples:
- Do not add server actions just because Next.js supports them.
- Do not add Supabase Auth just because Supabase recommends it for many apps.
- Do not add Supabase Storage because Supabase Storage exists.
- Do not add extensive E2E test suites before core backend requirements are complete.
- Do not add browser polish before tenant isolation, idempotency, audit logs, and tests are complete.

## AI/Codex Workflow

Always work in phases.

Before coding a phase:
1. Restate the phase goal.
2. Identify files likely to change.
3. Identify tests to add or update.
4. Identify risks.
5. Identify MCPs to use and why.
6. Wait for plan approval if using plan mode.

After coding:
1. Run relevant tests.
2. Report what changed.
3. Report what is incomplete.
4. Report any questionable code or tradeoffs.

Do not move to the next phase until the current phase passes its acceptance criteria.

## Documentation Rules

Update README whenever setup or commands change.

Update docs/CODE_SUMMARY.md when adding a major module.

Update docs/ARCHITECTURE_REVIEW.md near the end with honest tradeoffs.

Add AI session exports to /ai-history chronologically.

Do not rewrite or sanitize AI history to look better.

## Definition of Done

The implementation is not complete until:

- npm scripts exist: dev, test, db:migrate, db:seed
- tests pass
- tenant isolation tests pass
- seed data works
- frontend supports required screens
- README is complete
- .env.example is complete
- docs are complete
- ai-history is present
- Loom URL is added to README
