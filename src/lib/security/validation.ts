import { z } from "zod";
import { categories } from "../types";
export const uploadSchema = z.object({
  student_id: z.uuid(),
  scope_id: z.uuid(),
  initial_status: z.enum(["draft", "issued"]),
  title: z.string().trim().min(3).max(120),
  category: z.enum(categories),
  description: z.string().trim().max(1000).optional(),
});
export const lifecycleSchema = z
  .object({
    expected_status: z.enum(["draft", "issued", "archived", "revoked"]),
    status: z.enum(["issued", "archived", "revoked"]),
    remarks: z.string().trim().max(1000),
  })
  .refine(
    (v) => !["archived", "revoked"].includes(v.status) || v.remarks.length >= 5,
    {
      message: "Provide a reason of at least 5 characters.",
      path: ["remarks"],
    },
  );
export const profileSchema = z.object({
  full_name: z.string().trim().min(2).max(100),
  department: z.string().trim().max(100),
});
export function validateFile(name: string, type: string, bytes: Uint8Array) {
  if (!bytes.length || bytes.length > 10 * 1024 * 1024)
    throw new Error("Files must be between 1 byte and 10 MB.");
  const ext = name.split(".").pop()?.toLowerCase();
  const pdf =
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d;
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b);
  const jpg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (ext === "pdf" && type === "application/pdf" && pdf)
    return "application/pdf";
  if (ext === "png" && type === "image/png" && png) return "image/png";
  if (["jpg", "jpeg"].includes(ext || "") && type === "image/jpeg" && jpg)
    return "image/jpeg";
  throw new Error(
    "Upload a valid PDF, JPG, or PNG. The file contents must match its type.",
  );
}
export function csv(rows: Record<string, unknown>[]) {
  const keys = Object.keys(rows[0] || {});
  const escape = (v: unknown) => {
    let s =
      typeof v === "object" && v !== null ? JSON.stringify(v) : String(v ?? "");
    if (/^[\s]*[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  return (
    "\ufeff" +
    [
      keys.map(escape).join(","),
      ...rows.map((r) => keys.map((k) => escape(r[k])).join(",")),
    ].join("\r\n")
  );
}
