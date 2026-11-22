import { createClient } from "@supabase/supabase-js";
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
  throw new Error("Development only. Set ALLOW_DEMO_SEED=true explicitly.");
for (const key of [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DEMO_STUDENT_A_EMAIL",
  "DEMO_STUDENT_B_EMAIL",
  "DEMO_STAFF_EMAIL",
  "DEMO_PASSWORD",
])
  if (!process.env[key]) throw new Error(`Missing ${key}`);
if (process.env.DEMO_PASSWORD.length < 12)
  throw new Error("DEMO_PASSWORD must contain at least 12 characters.");
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const check = ({ data, error }) => {
  if (error) throw error;
  return data;
};
const scopeId = "756e14bb-0bee-42bd-b415-0117a9f8c069";
check(
  await db
    .from("review_scopes")
    .upsert({ id: scopeId, name: "DEMO — Computer Science Issuance Scope" }),
);
const accounts = [
  ["DEMO_STUDENT_A_EMAIL", "Nirdesh Jain", "student", "DEMO-CS-001"],
  ["DEMO_STUDENT_B_EMAIL", "Ananya Sharma", "student", "DEMO-CS-002"],
  ["DEMO_STAFF_EMAIL", "Shreya Patel", "staff", null],
];
const users = [];
for (const [key, name, role, identifier] of accounts) {
  const email = process.env[key];
  let user;
  const created = await db.auth.admin.createUser({
    email,
    password: process.env.DEMO_PASSWORD,
    email_confirm: true,
    app_metadata: { campusvault_demo: true },
  });
  if (created.error) {
    if (
      !["email_exists", "email_address_exists"].includes(created.error.code) &&
      !created.error.message.includes("already")
    )
      throw created.error;
    for (let page = 1; !user; page++) {
      const result = check(
        await db.auth.admin.listUsers({ page, perPage: 100 }),
      );
      user = result.users.find((u) => u.email === email);
      if (result.users.length < 100) break;
    }
    if (!user) throw new Error("Could not resolve existing demo user");
    if (!user.app_metadata?.campusvault_demo)
      throw new Error(
        "Refusing to modify an account not created by the demo seed.",
      );
    const old = check(
      await db
        .from("profiles")
        .select("student_identifier")
        .eq("id", user.id)
        .maybeSingle(),
    );
    if (
      old &&
      role === "student" &&
      !old.student_identifier?.startsWith("DEMO-")
    )
      throw new Error("Refusing to modify a non-demo account");
  } else user = created.data.user;
  check(
    await db.from("profiles").upsert({
      id: user.id,
      full_name: name,
      email,
      role,
      student_identifier: identifier,
      department: "Computer Science & Engineering",
    }),
  );
  check(
    await db
      .from("scope_memberships")
      .upsert(
        { user_id: user.id, scope_id: scopeId, membership_type: role },
        { onConflict: "user_id,scope_id" },
      ),
  );
  users.push(user);
}
// Re-running is idempotent: only seed absent demo titles. It never overwrites real documents.
const specs = [
  ["Semester 4 Marksheet", "Academic Marksheet", "issued"],
  ["Student Identity Proof", "Student Identity", "issued"],
  ["Bonafide Certificate", "Certificate", "archived"],
  ["Fee Receipt", "Fee Receipt", "draft"],
  ["Academic Certificate", "Certificate", "revoked"],
];
function dummyPdf(title) {
  const content = `BT /F1 18 Tf 40 740 Td (DEMONSTRATION ONLY) Tj 0 -35 Td (${title}) Tj 0 -35 Td (CampusVault - Not an official academic record) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((o, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf +=
    `xref\n0 6\n0000000000 65535 f \n` +
    offsets
      .slice(1)
      .map((o) => `${String(o).padStart(10, "0")} 00000 n \n`)
      .join("") +
    `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}
const staff = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, publicKey, {
  auth: { persistSession: false },
});
check(
  await staff.auth.signInWithPassword({
    email: process.env.DEMO_STAFF_EMAIL,
    password: process.env.DEMO_PASSWORD,
  }),
);
for (let student = 0; student < 2; student++) {
  for (const [title, category, status] of specs) {
    const docTitle = `[VAULT DEMO] ${title}`;
    const existing = check(
      await db
        .from("documents")
        .select("id")
        .eq("owner_id", users[student].id)
        .eq("title", docTitle)
        .maybeSingle(),
    );
    if (existing) continue;
    const id = randomUUID(),
      bytes = dummyPdf(title);
    const path = check(
      await staff.rpc("prepare_issuance", {
        doc_id: id,
        target_student: users[student].id,
        target_scope: scopeId,
        doc_mime: "application/pdf",
      }),
    );
    check(
      await staff.storage
        .from("student-documents")
        .upload(path, bytes, { contentType: "application/pdf" }),
    );
    check(
      await staff.rpc("register_issuance", {
        doc_id: id,
        doc_title: docTitle,
        doc_category: category,
        doc_description:
          "Demonstration data only. Not an actual university record.",
        doc_filename: `demo-${title.toLowerCase().replaceAll(" ", "-")}.pdf`,
        doc_size: bytes.length,
        initial_status: status === "draft" ? "draft" : "issued",
      }),
    );
    if (["revoked", "archived"].includes(status))
      check(
        await staff.rpc("change_document_status", {
          doc_id: id,
          expected_status: "issued",
          new_status: status,
          remarks: "Demo document superseded.",
        }),
      );
  }
}
console.log(
  "Staff-assigned demo documents are ready. Existing legacy records were preserved. Credentials remain in your local environment.",
);
