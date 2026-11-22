import "server-only";
import { redirect } from "next/navigation";
import { supabase, configured } from "./supabase/server";
import type { Profile, Role } from "./types";
export async function session() {
  if (!configured()) return null;
  const db = await supabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;
  const { data, error } = await db
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (error || !data) return null;
  return { db, profile: data as Profile };
}
export async function requireRole(role: Role) {
  const s = await session();
  if (!s) redirect("/login");
  if (s.profile.role !== role) {
    await s.db.rpc("log_role_denial", { requested_role: role });
    redirect("/unauthorized");
  }
  return s;
}
