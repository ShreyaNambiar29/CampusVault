import "server-only";
import { z } from "zod";
import { uploadSchema } from "./validation";
export const prepareSchema = z
  .object({
    student_id: z.uuid(),
    scope_id: z.uuid(),
    name: z.string().min(1).max(255),
    type: z.enum(["application/pdf", "image/jpeg", "image/png"]),
    size: z.number().int().positive().max(10485760),
  })
  .refine(
    (v) => {
      const ext = v.name.split(".").pop()?.toLowerCase();
      return v.type === "application/pdf"
        ? ext === "pdf"
        : v.type === "image/png"
          ? ext === "png"
          : ["jpg", "jpeg"].includes(ext || "");
    },
    { message: "File extension and type must match." },
  );
export const completeSchema = uploadSchema.extend({
  id: z.uuid(),
  name: z.string().min(1).max(255),
  type: z.enum(["application/pdf", "image/jpeg", "image/png"]),
});
