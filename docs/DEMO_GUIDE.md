# Examiner demonstration — University Document Vault

## Prepare

Use a dedicated Supabase demo project. Fresh project: apply 001 then 002. Existing project: follow MIGRATION_TO_VAULT.md and apply only 002. Configure Auth callbacks/SMTP, disable public signup, set .env.local runtime/demo variables and run npm run seed. Start npm run dev. Use separate browser contexts for Student A, Student B and Staff A. Use only dummy PDFs. Preview routes are visual inspection, not cloud-security evidence.

## Staff issues a document

Sign in as Staff. Show Student Directory, search Student A, choose Issue document. Confirm recipient and shared scope. Upload a dummy official marksheet and save Draft. It appears in the Staff inventory. Copy the document UUID. Show no Approve/Reject workflow.

## Draft denial

As Student A, request `/student/documents/UUID`: Access denied. The API `/api/documents/UUID/access?kind=preview` returns 403, without metadata. Student has no upload navigation/page. Direct database/Storage upload and status update requests are blocked; the live security script demonstrates these without printing keys.

## Official issuance and allowed access

As Staff, open the Draft and Issue document, then confirm issuance. Show issued_by, issued_at, document_events and document_issued audit evidence. As Student A, refresh: the document appears under Recently issued and My documents. Preview/download succeeds. Dashboard shows issued records/categories, with no pending/rejected metrics.

## Cross-student denial

As Student B, use the same UUID. Browser detail is denied; in the authenticated browser console:

```js
fetch("/api/documents/PASTE-UUID/access?kind=preview")
  .then(async (r) => ({ status: r.status, body: await r.json() }))
  .then(console.log);
```

Expected 403 with no title/path/URL. Show the committed denied access event. Unknown valid UUIDs have the same response shape. A trusted operator can provision a separate scope to demonstrate Staff scope isolation; the hosted security script creates a tagged isolated record for this check.

## Archive and revoke

As Staff, archive or revoke an Issued record. Show mandatory reason, expected-state protection, immutable history and audit. Student metadata/new file links are now denied. Previously generated URLs can last up to 60 seconds; downloaded copies cannot be recalled. Legacy pre-upgrade submissions are Archived and retain their original status/review history; they cannot be silently issued.

## Role denial and export

As Student A navigate `/staff/issue`: server blocks before Staff data is rendered and logs role denial. `/api/exports?kind=documents` returns 403. As Staff, export authorized metadata and audit CSV with date/status filters. Confirm no private paths/bytes, formula escaping and data_exported audit. Explain that CSV is not a disaster-recovery backup.

## Evidence

Show private bucket and RLS, immutable review history preserved from the old schema, new issuance session/events, and test results. Run npm test, npm run test:db and browser tests locally; run npm run test:live only in the configured dedicated cloud demo. Never display secrets, real documents or signed tokens. No deployment is part of this demonstration.
