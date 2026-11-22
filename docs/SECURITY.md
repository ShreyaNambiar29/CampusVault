# Security

Exactly Student and Staff roles exist. Roles are trusted profile values after server-verified Supabase Auth, never login-form input. Existing identity provisioning, safe profile field allowlisting, session refresh, same-origin mutation checks and security headers remain.

Students have no upload or status-change permissions. Student routes exclude upload. Both prepare/complete require Staff; old upload/review endpoints authorize then return 410. Database execution of old registration/review writers is revoked. Storage INSERT requires an exact unexpired Staff issuance session, not simply a path prefix.

Staff issue only to a Student with explicit membership in a scope currently assigned to that Staff user. The prepared session binds staff/student/scope/path/MIME. Completion rechecks current scope and recipient membership, validates actual bytes and uses the stored path. Cross-scope or client-forged assignments fail. Storage and table policies enforce the same rules on direct Supabase requests.

Students can read only owner_id=auth.uid AND status=issued. This applies to database reads, detail-page authorization, file access RPCs and private Storage. Draft, Archived, Revoked and legacy submissions are hidden from Students. Staff read/manage only authorized scopes. Generic document API 403 responses reveal no filenames, paths or signed URLs; denial auditing commits even for unknown UUIDs.

Lifecycle changes lock the record and require expected_status. Invalid/stale transitions fail. Archive/revoke require reasons. Issuer, timestamps, immutable document_events and constrained audit events are written transactionally. Legacy submissions cannot be issued. No role/scope/status mutation grants are exposed to clients. Audit writes cannot be forged using arbitrary client actions/metadata.

Signed access URLs expire after 60 seconds. Revocation blocks new access immediately but cannot invalidate an already issued URL before its expiry or recall saved files. Signed upload tokens last two hours and target one non-overwritable object. Orphan cleanup is operator-managed after expiry. File signatures are practical format validation, not antivirus.

CSV exports require scoped Staff access, exclude paths/file contents and escape spreadsheet formulas. Every export is audited. Runtime credentials remain unprivileged; only explicit development seed/security scripts use a server-only service key.

Tests: local validation/CSV tests; browser workflows and role-appropriate UI; isolated PostgreSQL 001→002 upgrade preservation plus authorization assertions. The hosted security script additionally exercises actual Auth/Storage and concurrent status transitions when configured. Hosted integration remains unverified until run against a supplied project. Failed Auth attempts remain in Supabase Auth logs; successful logins and permitted document operations use purpose-specific audit functions.
