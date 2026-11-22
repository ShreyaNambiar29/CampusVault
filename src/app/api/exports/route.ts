import { authorize, failure, HttpError, noStore } from "@/lib/security/http";
import { csv } from "@/lib/security/validation";
export async function GET(request: Request) {
  try {
    const { db } = await authorize("staff");
    const p = new URL(request.url).searchParams;
    const kind = p.get("kind");
    const status = p.get("status") || "all";
    const from = p.get("from"),
      to = p.get("to");
    if (
      !["documents", "activity"].includes(kind || "") ||
      !["all", "draft", "issued", "archived", "revoked"].includes(status)
    )
      throw new HttpError(400, "Invalid export options.");
    for (const d of [from, to])
      if (d && (!/^\d{4}-\d{2}-\d{2}$/.test(d) || isNaN(Date.parse(d))))
        throw new HttpError(400, "Invalid date filter.");
    if (from && to && from > to)
      throw new HttpError(400, "Invalid date range.");
    // RLS on both tables applies the caller’s explicit review scopes. Paginate to avoid Supabase row limits.
    const rows: Record<string, unknown>[] = [];
    for (let offset = 0; ; offset += 500) {
      let q =
        kind === "documents"
          ? db
              .from("documents")
              .select(
                "id,owner_id,title,category,original_filename,file_size,status,issued_by,issued_at,lifecycle_remarks,created_at",
              )
          : db
              .from("activity_logs")
              .select(
                "id,actor_id,action,resource_type,resource_id,result,created_at",
              );
      if (from) q = q.gte("created_at", `${from}T00:00:00+05:30`);
      if (to) q = q.lte("created_at", `${to}T23:59:59.999+05:30`);
      if (kind === "documents" && status !== "all") q = q.eq("status", status);
      const { data, error } = await q
        .order("created_at")
        .order("id")
        .range(offset, offset + 499);
      if (error) throw error;
      rows.push(...data);
      if (data.length < 500) break;
    }
    const { error } = await db.rpc("record_export", { export_kind: kind });
    if (error) throw error;
    return new Response(csv(rows), {
      headers: {
        ...noStore,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="campusvault-${kind}.csv"`,
      },
    });
  } catch (e) {
    return failure(e);
  }
}
