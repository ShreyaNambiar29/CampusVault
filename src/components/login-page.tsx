import Link from "next/link";
import {
  Cloud,
  LockKeyhole,
  Zap,
  ArrowUpRight,
  GraduationCap,
  ShieldCheck,
} from "lucide-react";
import { Brand } from "./brand";
import { AuthForm } from "./auth-form";
import { configured } from "@/lib/supabase/server";
export function LoginPage({
  mode = "login",
}: {
  mode?: "login" | "forgot" | "reset";
}) {
  return (
    <main className="login-page">
      <section className="login-story">
        <Brand />
        <div className="story-copy">
          <span className="eyebrow light">
            <span className="live-dot" /> YOUR ACADEMIC LIFE, SAFELY STORED
          </span>
          <h1>
            Your documents.
            <br />
            <span>Our secure cloud.</span>
          </h1>
          <p>
            One trusted space for every milestone.
            <br />
            Securely access your university-issued
            <br className="desktop-br" /> academic documents, wherever you are.
          </p>
        </div>
        <div className="login-campus" />
        <div className="trust-features">
          <div>
            <LockKeyhole />
            Private by design
          </div>
          <div>
            <Cloud />
            Cloud powered
          </div>
          <div>
            <Zap />
            Instant access
          </div>
        </div>
        <div className="institution">
          <GraduationCap />
          <div>
            K.R. Mangalam University<small>THE PURSUIT OF EXCELLENCE</small>
          </div>
        </div>
      </section>
      <section className="login-main">
        <div className="auth-top">
          <span>University Document Vault</span>
          <ShieldCheck size={18} />
        </div>
        <div className="auth-card">
          <div className="auth-emblem">
            <ShieldCheck size={28} />
          </div>
          <span className="eyebrow">WELCOME TO CAMPUSVAULT</span>
          <h2>
            {mode === "login"
              ? "Welcome back."
              : mode === "forgot"
                ? "Forgot your password?"
                : "A fresh start."}
          </h2>
          <p>
            {mode === "login"
              ? "Your next milestone starts here. Sign in to your workspace."
              : mode === "forgot"
                ? "We’ll send a secure link to your university email."
                : "Choose a strong password to secure your workspace."}
          </p>
          <AuthForm mode={mode} configured={configured()} />
          {mode === "login" && (
            <>
              <div className="auth-divider">
                <span>EXPLORE THE EXPERIENCE</span>
              </div>
              <div className="preview-links">
                <Link href="/preview/student/dashboard">
                  Student preview
                  <ArrowUpRight size={16} />
                </Link>
                <Link href="/preview/staff/dashboard">
                  Staff preview
                  <ArrowUpRight size={16} />
                </Link>
              </div>
              <p className="preview-caption">
                Design preview only · no live documents or authentication
              </p>
              <div className="contact-note">
                Need an account? Contact your university administration.
              </div>
            </>
          )}
        </div>
        <footer>
          © {new Date().getFullYear()} CampusVault{" "}
          <span>
            <LockKeyhole size={12} /> Your privacy comes first
          </span>
        </footer>
      </section>
    </main>
  );
}
