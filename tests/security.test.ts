import test from "node:test";
import assert from "node:assert/strict";
import {
  csv,
  validateFile,
  lifecycleSchema,
  uploadSchema,
  profileSchema,
} from "../src/lib/security/validation";
test("accept PDF, PNG and JPEG signatures", () => {
  assert.equal(
    validateFile(
      "a.pdf",
      "application/pdf",
      new Uint8Array([37, 80, 68, 70, 45, 49]),
    ),
    "application/pdf",
  );
  assert.equal(
    validateFile(
      "a.png",
      "image/png",
      new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    ),
    "image/png",
  );
  assert.equal(
    validateFile("a.jpeg", "image/jpeg", new Uint8Array([255, 216, 255, 224])),
    "image/jpeg",
  );
});
test("reject mismatched extension, MIME and magic bytes", () => {
  for (const [name, type, bytes] of [
    ["evil.pdf", "application/pdf", [60, 104, 116, 109, 108]],
    ["a.exe", "application/pdf", [37, 80, 68, 70, 45]],
    ["a.pdf", "image/png", [37, 80, 68, 70, 45]],
  ] as const)
    assert.throws(() => validateFile(name, type, new Uint8Array(bytes)));
});
test("reject empty and oversized files", () => {
  assert.throws(() =>
    validateFile("a.pdf", "application/pdf", new Uint8Array()),
  );
  assert.throws(() =>
    validateFile("a.pdf", "application/pdf", new Uint8Array(10485761)),
  );
});
test("lifecycle validation requires reasons and rejects obsolete statuses", () => {
  assert.equal(
    lifecycleSchema.safeParse({
      expected_status: "issued",
      status: "revoked",
      remarks: " ",
    }).success,
    false,
  );
  assert.equal(
    lifecycleSchema.safeParse({
      expected_status: "issued",
      status: "archived",
      remarks: " ",
    }).success,
    false,
  );
  assert.equal(
    lifecycleSchema.safeParse({
      expected_status: "draft",
      status: "issued",
      remarks: "",
    }).success,
    true,
  );
  assert.equal(
    lifecycleSchema.safeParse({
      expected_status: "issued",
      status: "revoked",
      remarks: "Superseded record",
    }).success,
    true,
  );
  assert.equal(
    lifecycleSchema.safeParse({
      expected_status: "pending",
      status: "verified",
      remarks: "",
    }).success,
    false,
  );
});
test("issuance requires an explicit student, scope and initial status", () => {
  const metadata = { title: "Official record", category: "Other" };
  assert.equal(uploadSchema.safeParse(metadata).success, false);
  assert.equal(
    uploadSchema.safeParse({
      ...metadata,
      student_id: "11111111-1111-4111-8111-111111111111",
      scope_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      initial_status: "draft",
    }).success,
    true,
  );
  assert.equal(
    uploadSchema.safeParse({
      ...metadata,
      student_id: "invalid",
      scope_id: "fake",
      initial_status: "issued",
    }).success,
    false,
  );
});
test("metadata validation and profile allowlist prevent role injection", () => {
  assert.equal(
    uploadSchema.safeParse({ title: "ok", category: "Other" }).success,
    false,
  );
  const value = profileSchema.parse({
    full_name: "Student A",
    department: "CS",
    role: "staff",
    scope_id: "fake",
  });
  assert.deepEqual(Object.keys(value), ["full_name", "department"]);
});
test("CSV safely quotes commas, newlines, quotes and formula injection", () => {
  const result = csv([
    { name: '=HYPERLINK("evil")', note: 'a,b\n"c"' },
    { name: "  +SUM(1)", note: "normal" },
  ]);
  assert.ok(result.startsWith("\ufeff"));
  assert.ok(result.includes('"\'=HYPERLINK(""evil"")"'));
  assert.ok(result.includes('"\'  +SUM(1)"'));
  assert.ok(result.includes('"a,b\n""c"""'));
});
