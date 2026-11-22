# Database

001 is the preserved original schema. 002 incrementally converts it to University Document Vault. See MIGRATION_TO_VAULT.md before updating existing installations.

Preserved tables: profiles, review_scopes (now used as issuance scopes), scope_memberships, documents, activity_logs, document_reviews (historical, no longer writable by users). Existing identities, memberships, review fields and files remain.

The documents table retains the original status in legacy_status with its old enum, and adds status using vault_document_status (draft/issued/archived/revoked), issued_by, issued_at, lifecycle_remarks and status_changed_at. Existing rows are archived, without an issuer. An issued record must have issuer and timestamp. Assignment is immutable to application clients. Indexed owner/issue time and scope/status support the new queries.

New tables:

- issuance_uploads: document UUID, staff/student/scope binding, generated path/MIME, expiry and completion timestamp. Clients have SELECT only under owner/scope RLS. Preparation is through a checked definer RPC.
- document_events: immutable lifecycle transitions with actor, previous/new state, remarks and time. Readable only when the underlying document is authorized.

Purpose RPCs:

- prepare_issuance: Staff role + Staff scope + actual Student membership. Creates a one-document upload session.
- can_upload_issuance: exact session path, current staff scope, unexpired/incomplete session. Used by private Storage policies.
- register_issuance: locks the session, validates owner/scope/recipient and existing object, creates Draft/Issued metadata + event + audit, marks session complete atomically.
- change_document_status: locks document, checks scope and expected status, validates lifecycle and reasons, writes issuer/time/history/audit atomically.
- access_document: current authorization before exposing metadata; unknown/forbidden IDs yield null and a committed safe denial event.

Old register_document/review_document are disabled and execution is revoked; no historical table/type is dropped. Existing fixed-search-path security helpers remain. Application role/profile editing is unchanged; only full_name/department are editable.

Students can SELECT only their own Issued records. Staff can SELECT only scoped records. Audit SELECT allows own actions, permitted Staff scopes, and limited actions on currently accessible issued records. No arbitrary audit/history writes are granted. Storage SELECT resolves registered documents through the same issued-only/scope rule; own Staff upload sessions permit orphan validation/cleanup. Student Storage INSERT is removed. Registered files cannot be overwritten/deleted by clients.
