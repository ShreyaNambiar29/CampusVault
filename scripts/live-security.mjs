import { createClient } from "@supabase/supabase-js";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const publicKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!publicKey)
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or legacy anon key).",
  );
if (
  process.env.NODE_ENV === "production" ||
  process.env.ALLOW_DEMO_SEED !== "true"
)
  throw new Error(
    "Use a dedicated development demo project and opt in with ALLOW_DEMO_SEED=true.",
  );
for (const key of [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DEMO_STUDENT_A_EMAIL",
  "DEMO_STUDENT_B_EMAIL",
  "DEMO_STAFF_EMAIL",
  "DEMO_PASSWORD",
])
  if (!process.env[key]) throw new Error(`Missing ${key}`);
const client = (key) =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
const admin = client(process.env.SUPABASE_SERVICE_ROLE_KEY),
  a = client(publicKey),
  b = client(publicKey),
  staff = client(publicKey);
const checked = (r) => {
  if (r.error) throw r.error;
  return r.data;
};
const login = async (db, email) =>
  checked(
    await db.auth.signInWithPassword({
      email,
      password: process.env.DEMO_PASSWORD,
    }),
  ).user;
const ua = await login(a, process.env.DEMO_STUDENT_A_EMAIL);
await login(b, process.env.DEMO_STUDENT_B_EMAIL);
await login(staff, process.env.DEMO_STAFF_EMAIL);
const invalid = await client(publicKey).auth.signInWithPassword({
  email: process.env.DEMO_STUDENT_A_EMAIL,
  password: randomUUID(),
});
assert.ok(invalid.error);
console.log("PASS: valid and invalid authentication");
const scope = checked(
  await a
    .from("scope_memberships")
    .select("scope_id")
    .eq("user_id", ua.id)
    .eq("membership_type", "student")
    .limit(1)
    .single(),
).scope_id;
const id = randomUUID(),
  bytes = Buffer.from("%PDF-1.4\n% University Vault security test\n%%EOF");
assert.ok(
  (
    await a.rpc("prepare_issuance", {
      doc_id: id,
      target_student: ua.id,
      target_scope: scope,
      doc_mime: "application/pdf",
    })
  ).error,
);
assert.ok(
  (
    await a.storage
      .from("student-documents")
      .upload(`students/${ua.id}/${id}/${id}.pdf`, bytes, {
        contentType: "application/pdf",
      })
  ).error,
);
assert.ok(
  (
    await a.rpc("register_document", {
      doc_id: id,
      doc_scope: scope,
      doc_title: "Bypass",
      doc_category: "Other",
      doc_description: "",
      doc_filename: "x.pdf",
      doc_path: "x",
      doc_mime: "application/pdf",
      doc_size: 1,
    })
  ).error,
);
console.log("PASS: student uploads and retired registration blocked");
const path = checked(
  await staff.rpc("prepare_issuance", {
    doc_id: id,
    target_student: ua.id,
    target_scope: scope,
    doc_mime: "application/pdf",
  }),
);
checked(
  await staff.storage
    .from("student-documents")
    .upload(path, bytes, { contentType: "application/pdf" }),
);
checked(
  await staff.rpc("register_issuance", {
    doc_id: id,
    doc_title: "[SECURITY TEST] Official draft",
    doc_category: "Other",
    doc_description: "Demonstration only.",
    doc_filename: "security-test.pdf",
    doc_size: bytes.length,
    initial_status: "draft",
  }),
);
assert.equal(
  checked(
    await a.rpc("access_document", { doc_id: id, access_kind: "preview" }),
  ),
  null,
);
assert.ok((await a.storage.from("student-documents").download(path)).error);
assert.ok(
  (
    await a.rpc("change_document_status", {
      doc_id: id,
      expected_status: "draft",
      new_status: "issued",
      remarks: "",
    })
  ).error,
);
assert.ok(
  (await a.from("documents").update({ status: "issued" }).eq("id", id)).error,
);
assert.ok(
  (await a.from("profiles").update({ role: "staff" }).eq("id", ua.id)).error,
);
assert.ok(
  (
    await a.from("activity_logs").insert({
      actor_id: ua.id,
      action: "forged",
      resource_type: "document",
      result: "success",
    })
  ).error,
);
assert.ok((await a.rpc("record_export", { export_kind: "documents" })).error);
console.log(
  "PASS: draft isolation, status/role escalation and audit/export integrity",
);
checked(
  await staff.rpc("change_document_status", {
    doc_id: id,
    expected_status: "draft",
    new_status: "issued",
    remarks: "Official issue test",
  }),
);
assert.ok(
  checked(
    await a.rpc("access_document", { doc_id: id, access_kind: "preview" }),
  ),
);
const signed = checked(
  await a.storage.from("student-documents").createSignedUrl(path, 60),
);
assert.equal((await fetch(signed.signedUrl)).status, 200);
assert.equal(
  checked(
    await b.rpc("access_document", { doc_id: id, access_kind: "download" }),
  ),
  null,
);
assert.equal(
  checked(await b.from("documents").select("id").eq("id", id)).length,
  0,
);
assert.ok((await b.storage.from("student-documents").download(path)).error);
assert.ok(
  checked(
    await b
      .from("activity_logs")
      .select("id")
      .eq("resource_id", id)
      .eq("result", "denied"),
  ).length,
);
console.log(
  "PASS: issued owner access, signed download and cross-student denial",
);
assert.ok(
  (
    await staff.rpc("change_document_status", {
      doc_id: id,
      expected_status: "issued",
      new_status: "revoked",
      remarks: "",
    })
  ).error,
);
const transitions = await Promise.all(
  ["archived", "revoked"].map((status) =>
    staff.rpc("change_document_status", {
      doc_id: id,
      expected_status: "issued",
      new_status: status,
      remarks: "Lifecycle concurrency test",
    }),
  ),
);
assert.equal(transitions.filter((r) => !r.error).length, 1);
assert.equal(transitions.filter((r) => r.error).length, 1);
assert.equal(
  checked(
    await a.rpc("access_document", { doc_id: id, access_kind: "download" }),
  ),
  null,
);
assert.ok((await a.storage.from("student-documents").download(path)).error);
console.log(
  "PASS: reason required, concurrent lifecycle change serialized and student access withdrawn",
);
const otherScope = checked(
  await admin
    .from("review_scopes")
    .insert({ name: `[SECURITY TEST] Isolated ${id}` })
    .select("id")
    .single(),
).id;
const otherId = randomUUID();
checked(
  await admin.from("documents").insert({
    id: otherId,
    owner_id: ua.id,
    scope_id: otherScope,
    title: "[SECURITY TEST] Other scope draft",
    category: "Other",
    original_filename: "out-of-scope.pdf",
    storage_path: `security-test-no-object/${otherId}`,
    mime_type: "application/pdf",
    file_size: 1,
    status: "draft",
  }),
);
assert.equal(
  checked(await staff.from("documents").select("id").eq("id", otherId)).length,
  0,
);
assert.equal(
  checked(
    await staff.rpc("access_document", {
      doc_id: otherId,
      access_kind: "preview",
    }),
  ),
  null,
);
assert.ok(
  (
    await staff.rpc("change_document_status", {
      doc_id: otherId,
      expected_status: "draft",
      new_status: "issued",
      remarks: "",
    })
  ).error,
);
assert.ok(
  (
    await staff.rpc("prepare_issuance", {
      doc_id: randomUUID(),
      target_student: ua.id,
      target_scope: otherScope,
      doc_mime: "application/pdf",
    })
  ).error,
);
console.log(
  "PASS: out-of-scope Staff management and recipient assignment blocked",
);
checked(await staff.rpc("record_export", { export_kind: "documents" }));
assert.ok(
  checked(
    await staff
      .from("activity_logs")
      .select("id")
      .eq("action", "data_exported"),
  ).length,
);
checked(await a.auth.signOut());
assert.ok(
  (await a.rpc("access_document", { doc_id: id, access_kind: "preview" }))
    .error,
);
console.log(
  "PASS: export audit and logout. Tagged test records remain in the dedicated demo project.",
);
