import "server-only";
import { NextResponse } from "next/server";
import { session } from "@/lib/auth";
import { configured } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function authorize(role?: Role) {
  if (!configured()) throw new HttpError(503, "Supabase is not configured.");
  const s = await session();
  if (!s) throw new HttpError(401, "Please sign in to continue.");
  if (role && s.profile.role !== role) {
    await s.db.rpc("log_role_denial", { requested_role: role });
    throw new HttpError(
      403,
      "You do not have permission to access this resource.",
    );
  }
  return s;
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin)
    throw new HttpError(403, "Invalid request origin.");
}
export function failure(e: unknown) {
  if (e instanceof HttpError)
    return NextResponse.json(
      { error: e.message },
      { status: e.status, headers: { "Cache-Control": "no-store" } },
    );
  console.error(
    "CampusVault request failed:",
    e instanceof Error ? e.message : "Unknown failure",
  );
  return NextResponse.json(
    { error: "The request could not be completed. Please try again." },
    { status: 500 },
  );
}
export const noStore = { "Cache-Control": "private, no-store" };
