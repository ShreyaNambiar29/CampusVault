import { NextResponse } from "next/server";
import {
  authorize,
  failure,
  HttpError,
  sameOrigin,
  noStore,
} from "@/lib/security/http";
import { prepareSchema } from "@/lib/security/upload";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { db } = await authorize("staff");
    const input = prepareSchema.safeParse(await request.json());
    if (!input.success)
      throw new HttpError(400, "Choose a PDF, JPG or PNG file up to 10 MB.");
    const id = crypto.randomUUID();
    const { data: path, error: permissionError } = await db.rpc(
      "prepare_issuance",
      {
        doc_id: id,
        target_student: input.data.student_id,
        target_scope: input.data.scope_id,
        doc_mime: input.data.type,
      },
    );
    if (permissionError || !path)
      throw new HttpError(
        403,
        "The selected student or issuance scope is not authorized.",
      );
    const { data, error } = await db.storage
      .from("student-documents")
      .createSignedUploadUrl(path, {
        upsert: false,
      });
    if (error) throw error;
    return NextResponse.json({ id, url: data.signedUrl }, { headers: noStore });
  } catch (e) {
    return failure(e);
  }
}
