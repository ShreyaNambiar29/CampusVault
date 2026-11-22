import { NextResponse } from "next/server";
import { authorize, failure, HttpError, sameOrigin } from "@/lib/security/http";
import { profileSchema } from "@/lib/security/validation";
export async function PATCH(request: Request) {
  try {
    sameOrigin(request);
    const { db, profile } = await authorize();
    const input = profileSchema.safeParse(await request.json());
    if (!input.success)
      throw new HttpError(400, "Please check the profile fields.");
    const { error } = await db
      .from("profiles")
      .update(input.data)
      .eq("id", profile.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
