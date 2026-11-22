import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize, failure, HttpError, sameOrigin } from "@/lib/security/http";
import { lifecycleSchema } from "@/lib/security/validation";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    sameOrigin(request);
    const { db } = await authorize("staff");
    const { id } = await params;
    if (!z.uuid().safeParse(id).success)
      throw new HttpError(400, "Invalid document request.");
    const input = lifecycleSchema.safeParse(await request.json());
    if (!input.success)
      throw new HttpError(
        400,
        "Check the document status and provide a reason for archive or revocation.",
      );
    const { data: doc } = await db
      .from("documents")
      .select("id")
      .eq("id", id)
      .single();
    if (!doc)
      throw new HttpError(
        403,
        "You do not have permission to manage this document.",
      );
    const { error } = await db.rpc("change_document_status", {
      doc_id: id,
      expected_status: input.data.expected_status,
      new_status: input.data.status,
      remarks: input.data.remarks,
    });
    if (error)
      throw new HttpError(
        409,
        "Status could not be changed. Refresh the document and check the requested transition.",
      );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
