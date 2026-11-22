import { notFound, redirect } from "next/navigation";
import { previewData } from "@/lib/preview";
import { Workspace } from "@/components/workspace";
export default async function Page({
  params,
}: {
  params: Promise<{ role: string; path?: string[] }>;
}) {
  const { role, path = [] } = await params;
  if (role !== "student" && role !== "staff") notFound();
  if (!path.length) redirect(`/preview/${role}/dashboard`);
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
  return (
    <Workspace
      data={previewData(role)}
      page={path[1] ? "detail" : path[0]}
      id={path[1]}
    />
  );
}
