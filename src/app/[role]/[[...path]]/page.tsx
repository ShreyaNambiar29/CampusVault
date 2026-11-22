import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { Workspace } from "@/components/workspace";
import type { DocumentRecord, Activity } from "@/lib/types";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ role: string; path?: string[] }>;
}) {
  const { role, path = [] } = await params;
  if (role !== "student" && role !== "staff") notFound();
  const { db, profile } = await requireRole(role);
  if (!path.length) redirect(`/${role}/dashboard`);
  const allowed =
    role === "student"
      ? ["dashboard", "documents", "activity", "profile"]
      : [
          "dashboard",
          "documents",
          "issue",
          "students",
          "activity",
          "exports",
          "profile",
        ];
  if (
    !allowed.includes(path[0]) ||
    path.length > 2 ||
    (path.length === 2 && path[0] !== "documents")
  )
    notFound();
  if (path[1]) {
    if (!/^[0-9a-f-]{36}$/i.test(path[1])) notFound();
    const { data, error } = await db.rpc("access_document", {
      doc_id: path[1],
      access_kind: "preview",
    });
    if (error) throw new Error("Unable to authorize document access.");
    if (!data) redirect("/unauthorized");
  }
  const fields =
    "id,owner_id,scope_id,title,category,description,original_filename,mime_type,file_size,status,legacy_status,lifecycle_remarks,issued_at,issued_by,created_at,owner:profiles!documents_owner_id_fkey(full_name,student_identifier)";
  const documents: DocumentRecord[] = [];
  const activities: Activity[] = [];
  // Retrieve every authorized page so project-level API row limits never truncate dashboard counts.
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db
      .from("documents")
      .select(fields)
      .order("created_at", { ascending: false })
      .order("id")
      .range(offset, offset + 499);
    if (error)
      throw new Error(
        "Document data could not be loaded. Check the Supabase migration and connection.",
      );
    documents.push(...(data as unknown as DocumentRecord[]));
    if (data.length < 500) break;
  }
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db
      .from("activity_logs")
      .select(
        "id,actor_id,action,resource_type,resource_id,result,metadata,created_at",
      )
      .order("created_at", { ascending: false })
      .order("id")
      .range(offset, offset + 499);
    if (error)
      throw new Error(
        "Activity data could not be loaded. Check the Supabase migration and connection.",
      );
    activities.push(...(data as Activity[]));
    if (data.length < 500) break;
  }

  const students = [];
  const memberships = [];
  const scopes = [];
  if (role === "staff") {
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await db
        .from("profiles")
        .select("*")
        .eq("role", "student")
        .order("full_name")
        .order("id")
        .range(offset, offset + 499);
      if (error) throw new Error("Student directory could not be loaded.");
      students.push(...data);
      if (data.length < 500) break;
    }
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await db
        .from("scope_memberships")
        .select("user_id,scope_id,membership_type")
        .order("id")
        .range(offset, offset + 499);
      if (error) throw new Error("Issuance memberships could not be loaded.");
      memberships.push(...data);
      if (data.length < 500) break;
    }
    const result = await db.from("review_scopes").select("id,name");
    if (result.error) throw new Error("Issuance scopes could not be loaded.");
    scopes.push(...result.data);
  }
  return (
    <Workspace
      data={{
        profile,
        documents,
        activities,
        preview: false,
        students,
        memberships,
        scopes,
      }}
      page={path[1] ? "detail" : path[0]}
      id={path[1]}
    />
  );
}
