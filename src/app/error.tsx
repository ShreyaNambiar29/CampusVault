"use client";
import { ShieldAlert } from "lucide-react";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="error-page">
      <ShieldAlert size={42} />
      <h1>We couldn’t load your workspace.</h1>
      <p>Check your connection and Supabase configuration, then try again.</p>
      <button className="btn btn-primary" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
