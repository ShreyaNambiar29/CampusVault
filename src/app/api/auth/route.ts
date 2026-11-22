import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";
import { authorize, failure, HttpError, sameOrigin } from "@/lib/security/http";
import { z } from "zod";
const schema = z.object({
  action: z.enum(["login", "forgot", "reset", "logout"]),
  email: z.email().max(254).optional(),
  password: z.string().max(128).optional(),
});
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const input = schema.safeParse(await request.json());
    if (!input.success)
      throw new HttpError(400, "Please enter a valid email and password.");
    const { action, email, password } = input.data;
    const db = await supabase();
    if (action === "logout") {
      const { error } = await db.auth.signOut();
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }
    if (action === "forgot") {
      if (!email) throw new HttpError(400, "Email is required.");
      await db.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin}/auth/callback?next=/reset-password`,
      });
      return NextResponse.json({ ok: true });
    }
    if (action === "reset") {
      await authorize();
      if (!password || password.length < 12)
        throw new HttpError(400, "Use at least 12 characters.");
      const { error } = await db.auth.updateUser({ password });
      if (error)
        throw new HttpError(
          400,
          "Password could not be updated. Request a new recovery link.",
        );
      return NextResponse.json({ redirect: "/" });
    }
    if (!email || !password)
      throw new HttpError(400, "Email and password are required.");
    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error) throw new HttpError(401, "Email or password is incorrect.");
    const { profile } = await authorize();
    const { error: logError } = await db.rpc("log_login");
    if (logError) throw logError;
    return NextResponse.json({ redirect: `/${profile.role}/dashboard` });
  } catch (e) {
    return failure(e);
  }
}
