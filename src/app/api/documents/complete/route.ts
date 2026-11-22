import { NextResponse } from "next/server";
import { authorize, failure, HttpError, sameOrigin } from "@/lib/security/http";
import { completeSchema } from "@/lib/security/upload";
import { validateFile } from "@/lib/security/validation";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { db, profile } = await authorize("staff");
    const input = completeSchema.safeParse(await request.json());
    if (!input.success)
      throw new HttpError(400, "Please check your document details.");
    const v = input.data;

    const { data: existing } = await db
      .from("documents")
      .select("id")
      .eq("id", v.id)
      .maybeSingle();
    if (existing) throw new HttpError(409, "Document already registered.");
    const { data: upload, error: uploadError } = await db
      .from("issuance_uploads")
      .select("storage_path,mime_type")
      .eq("document_id", v.id)
      .eq("staff_id", profile.id)
      .is("completed_at", null)
      .gt("expires_at", new Date().toISOString())
      .single();
    if (uploadError || !upload || upload.mime_type !== v.type)
      throw new HttpError(403, "Issuance upload is unavailable or expired.");
    const path = upload.storage_path;
    const { data: file, error: downloadError } = await db.storage
      .from("student-documents")
      .download(path);
    if (downloadError) throw downloadError;
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      try {
        if (file.type !== v.type)
          throw new Error("Stored file type does not match the document.");
        validateFile(v.name, file.type, bytes);
      } catch (e) {
        throw new HttpError(400, (e as Error).message);
      }
      const { error } = await db.rpc("register_issuance", {
        doc_id: v.id,
        doc_title: v.title,
        doc_category: v.category,
        doc_description: v.description,
        doc_filename: v.name.replace(/[\x00-\x1f]/g, "").slice(0, 255),
        doc_size: file.size,
        initial_status: v.initial_status,
      });
      if (error) throw error;
    } catch (e) {
      const { error } = await db.storage
        .from("student-documents")
        .remove([path]);
      if (error) console.error("Orphan upload cleanup failed for", v.id);
      throw e;
    }
    return NextResponse.json({ id: v.id }, { status: 201 });
  } catch (e) {
    return failure(e);
  }
}
