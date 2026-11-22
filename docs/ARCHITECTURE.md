# Architecture

The existing Next.js application, cookie-based Supabase Auth, trusted profiles, two roles, scoped PostgreSQL, and private Storage remain. proxy.ts refreshes sessions; every private page/API independently authorizes users. No service-role client exists in runtime code.

## Issuance flow

Staff → student directory/issuance form → server validates target Student and explicit shared scope → prepare_issuance creates immutable upload assignment → signed private upload → browser progress → completion server reads session, downloads bytes and validates MIME/extension/signature/size → register_issuance atomically creates Draft/Issued record and audit/history. Completion never uses a client-selected path or trusts changes to recipient/scope fields; assignment comes from the prepared session. Partial registration failures attempt orphan cleanup. Expired abandoned objects need operator cleanup after upload-token expiry.

Drafts are visible to authorized Staff only. Issue makes the assigned record visible to its Student. Archive/revoke withdraws new metadata/file access. Status changes require current scope, expected state and a row lock. Every state transition writes document_events and activity_logs in the same transaction.

The preserved access API checks current authorization, logs access/denial and generates 60-second signed links. Existing links can work until their expiry; downloaded bytes cannot be recalled. Student dashboards query only issued rows through RLS; Staff inventory and directory query only explicit scopes. CSV export uses caller-session RLS, filters and safe escaping.

## Preserved history

001 is unchanged. 002 retains all original users, private files, memberships, audit rows and review history. Student submissions become archived legacy records. No old verification is reinterpreted as official issuance. Retired writers are disabled after their dependencies are converted. See MIGRATION_TO_VAULT.md for coordinated rollout.

## Backup and recovery

CSV is a metadata export, not a full backup. Back up the database (including identities/authorization data through supported Supabase tooling) and separate private object bytes with exact paths, MIME metadata, sizes and checksums. Storage metadata does not contain file contents. Keep migrations and bucket configuration in source control. Encrypt independent backups and test restoration into an isolated project.

Restore identities and DB records consistently, apply/verify functions/grants/RLS, restore private bucket bytes under their exact paths, compare manifests, configure Auth origins, then test scoped Staff issuance and Student issued-only access before switching the approved application origin. Never recover by making the bucket public.

For scale, replace in-memory tables/exports with server pagination, aggregates and bounded export jobs/snapshots. Add malware scanning, monitoring and retention policies before larger institutional adoption.
