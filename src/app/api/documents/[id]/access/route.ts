import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize, failure, HttpError, noStore } from "@/lib/security/http";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { db } = await authorize();
    const { id } = await params;
    if (!z.uuid().safeParse(id).success)
      throw new HttpError(400, "Invalid document request.");
    const kind = new URL(request.url).searchParams.get("kind");
    if (kind !== "preview" && kind !== "download")
      throw new HttpError(400, "Invalid access action.");
    const { data, error } = await db.rpc("access_document", {
      doc_id: id,
      access_kind: kind,
    });
    if (error) throw error;
    if (!data)
      throw new HttpError(
        403,
        "You do not have permission to access this resource.",
      );
    const { data: signed, error: signError } = await db.storage
      .from("student-documents")
      .createSignedUrl(
        data.storage_path,
        60,
        kind === "download" ? { download: data.original_filename } : undefined,
      );
    if (signError) throw signError;
    return NextResponse.json({ url: signed.signedUrl }, { headers: noStore });
  } catch (e) {
    return failure(e);
  }
}
