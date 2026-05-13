# 08 — Phase 7 S3 Pre-Signed Uploads

## Goal

Implement secure tenant-scoped S3 pre-signed upload URL generation for Wellspring session media.

## Original Codex Prompt

Phase 7 focused on:
- `POST /api/uploads/session-media/presign` with JWT auth
- strict validation for `filename`, `contentType`, and `contentLength`
- tenant-scoped key generation:
  - `creators/{creatorId}/session-media/{uuid}.{ext}`
- short-lived S3 PUT pre-signed URLs (AWS SDK v3)
- same-transaction `UPLOAD_URL_CREATED` audit logging through runtime-role tenant context
- no frontend upload UI and no multipart upload in this phase

## Codex Plan

Approved implementation shape:
- add dedicated uploads module under `apps/api/src/uploads/*`
  - `s3-client.ts` for AWS SDK v3 signing
  - `service.ts` for validation, key generation, signing orchestration, and audit write
  - `presenters.ts` for response payload shape
- add route and schema:
  - `apps/api/src/http/routes/uploads.ts`
  - `apps/api/src/http/schemas/uploads.ts`
- update env validation and `.env.example`:
  - require AWS credentials + bucket/region
  - require `S3_PUBLIC_BASE_URL`
  - require `S3_PRESIGNED_URL_EXPIRES_SECONDS` with max bound
  - require `MAX_MEDIA_UPLOAD_BYTES`
- no DB migrations
- mock signing in tests (no real AWS calls)

## My Review

What I approved:
- requiring `S3_PUBLIC_BASE_URL` rather than inferring public URL format from bucket
- rejecting filename extension/content-type mismatches
- canonical content-type-to-extension mapping for key safety
- excluding `uploadUrl` from audit metadata

What I questioned:
- whether enforcing exact filename-extension compatibility might be stricter than some clients expect
- whether future flows should prefer multipart upload for larger media and keep this endpoint for smaller assets

What I changed manually:
- nothing in this phase

Bugs or issues found:
- none in implementation logic review; full DB-dependent integration test execution still depends on reachable local Postgres
