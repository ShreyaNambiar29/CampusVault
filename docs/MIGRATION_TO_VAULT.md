# Upgrade to University Document Vault

## What was inspected

The existing 001 migration has profiles, review_scopes, scope_memberships, documents, activity_logs, document_reviews and a private student-documents bucket. Application dependencies included student upload/prepare/complete endpoints, register_document/review_document RPCs, file policies, access_document, workspace queries, exports, preview fixtures, seed scripts and tests. These dependencies were updated together. No hosted database credentials were available during implementation; the actual hosted schema must be compared against 001 before applying 002.

## Preservation and classification

**Do not rerun 001 on an existing installation.** Apply only `supabase/migrations/002_university_document_vault.sql` after confirming 001 is already installed. A fresh installation applies 001 and then 002, in order.

002 runs in a transaction. It deletes no users, documents, private objects, activity logs or review history. The former document status column is renamed to `legacy_status`, keeping the old enum and original values. Original review fields, document_reviews and scope identities remain intact. A separate status column uses the new enum draft/issued/archived/revoked. Existing student submissions become **Archived**, with explicit legacy remarks and no issuer or issue timestamp. Old verification does not prove official university issuance, so legacy records cannot be promoted into Issued. Staff can inspect them within scope and issue a new official record separately.

New columns: status, issued_by, issued_at, lifecycle_remarks and status_changed_at. New tables: issuance_uploads for server-authorized student/scope/path bindings, and document_events for immutable lifecycle history. The private bucket keeps its existing name and old object paths. New files use `issued/{staffId}/{documentId}/{documentId}.{ext}`. Exactly two roles remain.

The retired register_document and review_document signatures remain as disabled functions with execution revoked from authenticated users. Their old historical tables/types remain, avoiding cascaded drops and data loss. New functions implement issuance preparation, registration and lifecycle changes. Existing read/access helpers and policies are replaced atomically.

## Safe rollout

1. In a maintenance window, capture document/user/review/audit/object counts. Inspect `information_schema.columns`, `pg_policies`, function definitions and grants against 001. Resolve schema drift before applying 002; the migration intentionally fails rather than guessing at unknown policy names.
2. Take a restorable database backup and a separate copy of private object bytes. A metadata CSV alone is insufficient. Test the upgrade in a cloned/staging project first.
3. Apply 002 once through Supabase migrations or run the complete transaction in SQL Editor. No environment secrets or Auth user changes are required.
4. Confirm preserved counts and legacy_status/review fields. Confirm all pre-upgrade records are Archived with issued_at/issued_by null, and the bucket is still private.
5. Release this application revision together with the migration. The updated app requires 002 and deliberately does not fall back to the old upload behavior.
6. Run the security script against a dedicated seeded staging project, then manually test a real signed upload through the Staff form. Test Student API/RLS/Storage denials, issued access, lifecycle transitions, exports and audit records.

No hosted migration, GitHub push or deployment was performed by this change. Do not roll back the code alone: old student upload code is incompatible with the new schema. Recover from a tested backup or implement a reviewed forward migration; do not drop new history or re-enable obsolete permissions casually.

## Lifecycle rules

- Create → Draft or Issued, assigned to one scoped student.
- Draft → Issued or Archived.
- Issued → Archived or Revoked.
- Archived → Revoked only if previously officially issued.
- Revoked is terminal. Legacy archived submissions are never issued.

Archive/revoke require a meaningful reason. A row lock and expected_status guard prevent concurrent or stale updates. Both history and audit are written in the same transaction. Newly generated links are denied immediately after withdrawal; previously minted signed URLs remain valid for at most their existing 60-second lifetime. Files already downloaded cannot be recalled.
