# CampusVault — University Document Vault

A secure document vault for K.R. Mangalam University, built for Computational Services in the Cloud. University Staff issue official records to specific Students. Students can view, preview and download only their own **Issued** documents.

This revision updates the existing application. It preserves its premium responsive UI, layouts, Auth integration, scopes, private storage, and database history. Exactly two roles remain: Student and Staff.

## Local run

```sh
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Without Supabase credentials, sign-in stays disabled and private routes fail closed. Explicitly labeled previews are available at `/preview/student/dashboard` and `/preview/staff/dashboard`; their records are fixtures, not a working cloud backend.

Runtime configuration:

| Variable                             | Purpose                                                    |
| ------------------------------------ | ---------------------------------------------------------- |
| NEXT_PUBLIC_SUPABASE_URL             | Supabase project URL                                       |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Public publishable key; all access still requires Auth/RLS |
| NEXT_PUBLIC_APP_URL                  | App origin, locally http://localhost:3000                  |

Development seed only: SUPABASE_SERVICE_ROLE_KEY, ALLOW_DEMO_SEED=true, DEMO_STUDENT_A_EMAIL, DEMO_STUDENT_B_EMAIL, DEMO_STAFF_EMAIL, DEMO_PASSWORD (12+ characters). Never expose privileged keys to browser code or commit .env.local. The running app uses no service-role client.

## Database setup and existing installations

**Existing installations:** inspect the live schema and apply only migration 002. **Fresh installations:** apply 001 then 002. Do not rerun 001 against existing data.

Read [MIGRATION_TO_VAULT.md](docs/MIGRATION_TO_VAULT.md) for preflight checks, safe classification, rollout and preserved records. The original status values remain in legacy_status and review history stays intact. All original student submissions are archived rather than silently promoted into official documents. No documents, users or private files are deleted.

In Supabase Auth, enable email/password, disable public signups, configure SMTP, and use exact allowed callbacks: `http://localhost:3000/auth/callback` and the recovery callback with `?next=/reset-password`. Set Site URL to the application origin. Keep existing Auth identities, credentials and memberships. Staff/Student roles are assigned by trusted database provisioning, never by client role selection.

The bucket remains **student-documents**, private, with a 10 MB PDF/JPEG/PNG limit. New uploads are Staff-only, bound to a student and scope through issuance_uploads. Object paths use generated UUIDs. The browser uploads directly to Supabase using a scoped signed upload URL, avoiding Vercel’s request body limit; completion downloads and validates bytes server-side before registration.

## Roles and features

**Student:** dashboard of issued records and categories, searchable/filterable list/grid library, secure previews/downloads, activity history, editable safe profile fields. There is no Student upload page or issuance/status permission.

**Staff:** dashboard, Issue Document, Student Directory, Document Inventory, Activity Logs and Export Center. Staff select a student and a shared authorized scope, upload a university file, save a Draft or issue immediately, and manage its lifecycle. Student Directory supports search and preselects the recipient in the issuance form. Staff have no automatic institution-wide access.

Statuses: **Draft**, **Issued**, **Archived**, **Revoked**. Only Issued records are readable by their Student recipient. Staff see records only within assigned scopes. Archive/revoke require reasons. Transitions lock rows, check expected state, and atomically record issuer, timestamps, lifecycle history and audit. Archived legacy submissions cannot be reclassified as official issuances.

## Routes

| Access        | Routes                                                                                                                                                    |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public        | `/`, `/login`, `/forgot-password`, `/reset-password`, `/unauthorized`                                                                                     |
| Student       | `/student/dashboard`, `/student/documents`, `/student/documents/[id]`, `/student/activity`, `/student/profile`                                            |
| Staff         | `/staff/dashboard`, `/staff/issue`, `/staff/students`, `/staff/documents`, `/staff/documents/[id]`, `/staff/activity`, `/staff/exports`, `/staff/profile` |
| Preview       | Corresponding pages under `/preview/student` and `/preview/staff`                                                                                         |
| Document APIs | `POST /api/documents/prepare`, `POST /api/documents/complete`, `GET /api/documents/[id]/access?kind=preview\|download`, `POST /api/documents/[id]/status` |
| Other APIs    | `POST /api/auth`, `GET /auth/callback`, `PATCH /api/profile`, `GET /api/exports`                                                                          |

`/student/upload` and `/staff/review` are removed. Old multipart and review API endpoints authorize callers and return 410 rather than executing obsolete logic. Private page routes and APIs authorize independently; the backend never trusts a supplied role or student assignment without scope validation.

## Demo provisioning

After applying both migrations in a **dedicated development project**, configure the seed variables and run `npm run seed`. It creates/reuses only tagged demo accounts and adds `[VAULT DEMO]` records assigned by Staff, with mixed lifecycle states. It does not overwrite legacy documents or automatically reset passwords. Re-running is additive/idempotent for its titles. Restore/recreate the dedicated demo project to reset; never delete shared/production records for a demo.

See [DEMO_GUIDE.md](docs/DEMO_GUIDE.md) for the examiner sequence: Staff draft → Student denied → Staff issue → assigned Student allowed → other Student denied → archive/revoke → Student denied → scoped CSV export.

## Checks

```sh
npm run typecheck
npm run lint
npm test
npm run test:db             # optional local PostgreSQL; createdb/psql/dropdb required
npx playwright install chromium
npm run test:browser
npm run build
npm start
```

`test:db` creates an isolated local database, populates 001, checks the old behavior, upgrades to 002 and asserts record preservation plus new RLS/functions/storage policies. Auth/Storage schemas are mocked in PostgreSQL; this is not a hosted Supabase test. Changes and temporary roles are rolled back and the database is dropped. It connects via /tmp, never to a cloud PGHOST.

Browser tests support configured and unconfigured local environments without signing in and verify preview UI/navigation, issuance assignment, inventory filtering, reason validation, removed routes, fail-closed APIs and responsive overflow. For actual cloud checks, run `npm run test:live` in the dedicated seeded project. It checks real authentication, private Storage, Student upload denial, issued-only visibility, scoped issuance, lifecycle concurrency, audit integrity and exports; tagged evidence remains in that project. No live cloud tests can be claimed without credentials.

## Export, backup and deployment

Staff Export Center generates authorized document metadata or audit CSV, with date/status filters, formula escaping and export auditing. Document bytes, private object paths and signed URLs are excluded. CSV satisfies the academic export demonstration but is not a disaster-recovery backup. Back up PostgreSQL separately from private object bytes and test restores; see [ARCHITECTURE.md](docs/ARCHITECTURE.md).

Deployment requires separate approval. When approved: push the reviewed repo to GitHub, import into Vercel as Next.js, set the three runtime variables, apply the incremental migration, set exact production Supabase callback origins, and run cloud smoke/security tests. Build command: `npm run build`. Do not add demo passwords or the seed service key to the deployed app. No GitHub push or Vercel deployment was performed.

## Stack and limits

Next.js App Router, TypeScript, Tailwind, existing Radix/shadcn-style components, Lucide, Motion, Supabase SSR/Auth/PostgreSQL/Storage, Zod, React Hook Form, TanStack Table, Recharts and Sonner. Versions are pinned by package-lock.json. No separate backend or DevOps infrastructure was introduced.

Workspace datasets and exports currently load authorized records into memory. Large deployments should use server pagination/aggregates, export snapshots/jobs, malware scanning and retention management. File signatures do not constitute malware scanning. Signed access URLs expire after 60 seconds; already downloaded bytes cannot be revoked. Supabase signed upload tokens last two hours and are bound to one non-overwritable object; abandoned files need operator cleanup after expiry. Failed logins are in Supabase Auth logs; the app does not forge audit identities. Legacy scope/bucket/table names remain for compatibility. Issuer IDs are stored; legacy review columns remain historical, not an active workflow.

The campus illustration is original artwork, not a university photograph or official logo. Existing visual branding and fonts are preserved. [SECURITY.md](docs/SECURITY.md) and [DATABASE.md](docs/DATABASE.md) describe the authorization model.

The public configuration also accepts NEXT_PUBLIC_SUPABASE_ANON_KEY for legacy projects. Prefer the publishable key; never use a secret/service-role key in either public variable. Session cookies refresh through Next.js 16 `src/proxy.ts`, which calls `auth.getUser()` after creating the SSR client. Browser and server helpers live in `src/lib/supabase/`.
