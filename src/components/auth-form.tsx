"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  Mail,
  LockKeyhole,
  ArrowRight,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";
export function AuthForm({
  mode = "login",
  configured,
}: {
  mode?: "login" | "forgot" | "reset";
  configured: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const f = new FormData(e.currentTarget);
      const r = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: mode,
          email: f.get("email"),
          password: f.get("password"),
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      if (data.redirect) window.location.assign(data.redirect);
      else
        toast.success(
          "If your account exists, a password reset email is on its way.",
        );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="auth-form">
      {mode !== "reset" && (
        <label>
          University email address
          <div className="input-icon">
            <Mail size={17} />
            <input
              name="email"
              type="email"
              placeholder="you@krmangalam.edu.in"
              required
              autoComplete="email"
            />
          </div>
        </label>
      )}
      {mode !== "forgot" && (
        <label>
          {mode === "reset" ? "New password" : "Password"}
          <div className="input-icon">
            <LockKeyhole size={17} />
            <input
              name="password"
              type={visible ? "text" : "password"}
              placeholder="Enter your password"
              required
              minLength={mode === "reset" ? 12 : 1}
              autoComplete={
                mode === "reset" ? "new-password" : "current-password"
              }
            />
            <button
              type="button"
              aria-label={visible ? "Hide password" : "Show password"}
              onClick={() => setVisible(!visible)}
            >
              {visible ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </label>
      )}
      {mode === "login" && (
        <div className="form-note">
          <span>
            <ShieldCheck size={14} /> Protected with Supabase Auth
          </span>
          <Link href="/forgot-password">Forgot password?</Link>
        </div>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <Button disabled={busy || !configured} type="submit">
        {busy ? <LoaderCircle size={18} className="spin" /> : null}
        {mode === "login"
          ? "Secure sign in"
          : mode === "forgot"
            ? "Send reset link"
            : "Update password"}
        <ArrowRight size={17} />
      </Button>
      {!configured && (
        <p className="setup-note">
          Backend setup required. Add the Supabase environment variables to
          enable secure sign in.
        </p>
      )}
      {mode !== "login" && (
        <Link className="back-link" href="/login">
          Back to sign in
        </Link>
      )}
    </form>
  );
}
