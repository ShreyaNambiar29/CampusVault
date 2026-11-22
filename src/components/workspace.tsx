"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  LayoutDashboard,
  Files,
  Upload,
  Activity,
  UserRound,
  LogOut,
  ShieldCheck,
  Bell,
  Menu,
  X,
  PanelLeftClose,
  ArrowUpRight,
  GraduationCap,
  Download,
  LifeBuoy,
} from "lucide-react";
import { Brand } from "./brand";
import type { WorkspaceData } from "@/lib/types";
import {
  Dashboard,
  Documents,
  ActivityPage,
  IssuePage,
  StudentDirectory,
  ProfilePage,
  ExportPage,
  DocumentDetail,
} from "./workspace-pages";
import { toast } from "sonner";
export function Workspace({
  data,
  page,
  id,
}: {
  data: WorkspaceData;
  page: string;
  id?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [search, setSearch] = useState("");
  const staff = data.profile.role === "staff";
  const base = `${data.preview ? "/preview" : ""}/${data.profile.role}`;
  const nav = staff
    ? ([
        ["dashboard", "Overview", LayoutDashboard],
        ["issue", "Issue document", Upload],
        ["students", "Student directory", UserRound],
        ["documents", "Document inventory", Files],
        ["activity", "Activity logs", Activity],
        ["exports", "Export center", Download],
      ] as const)
    : ([
        ["dashboard", "Dashboard", LayoutDashboard],
        ["documents", "My documents", Files],
        ["activity", "Activity history", Activity],
      ] as const);
  const initials = data.profile.full_name
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2);
  async function logout() {
    if (data.preview) {
      router.push("/login");
      return;
    }
    const r = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    if (r.ok) {
      router.push("/login");
      router.refresh();
    } else toast.error("Could not sign out. Please try again.");
  }
  return (
    <div className={`app-shell ${collapsed ? "is-collapsed" : ""}`}>
      {open && (
        <button
          className="drawer-scrim"
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
        />
      )}
      <aside className={`sidebar ${open ? "is-open" : ""}`}>
        <Link href={`${base}/dashboard`} className="sidebar-brand">
          <Brand compact={collapsed} />
        </Link>
        <button
          className="mobile-close"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        >
          <X size={20} />
        </button>
        <div className="workspace-label">
          {!collapsed && "UNIVERSITY WORKSPACE"}
          <button
            aria-label="Toggle sidebar"
            onClick={() => setCollapsed(!collapsed)}
          >
            <PanelLeftClose size={16} />
          </button>
        </div>
        <nav>
          {nav.map(([key, label, Icon]) => (
            <Link
              key={key}
              href={`${base}/${key}`}
              title={label}
              onClick={() => setOpen(false)}
              className={`nav-item ${page === key ? "active" : ""}`}
            >
              <Icon size={19} />
              {!collapsed && (
                <>
                  <span>{label}</span>
                  {staff && key === "documents" && (
                    <b>
                      {
                        data.documents.filter((d) => d.status === "draft")
                          .length
                      }
                    </b>
                  )}
                  {page === key && key !== "documents" && <i />}
                </>
              )}
            </Link>
          ))}
          <div className="nav-divider" />
          <Link
            href={`${base}/profile`}
            className={`nav-item ${page === "profile" ? "active" : ""}`}
            title="My profile"
          >
            <UserRound size={19} />
            {!collapsed && "My profile"}
          </Link>
        </nav>
        <div className="sidebar-bottom">
          {!collapsed && (
            <div className="secure-panel">
              <span className="secure-panel-icon">
                <ShieldCheck size={23} />
              </span>
              <h4>
                A safe space for
                <br />
                your academic journey.
              </h4>
              <p>Private. Protected. Always yours.</p>
              <span className="secure-label">
                <span className="live-dot" /> SECURE CLOUD STORAGE
              </span>
            </div>
          )}
          <button
            className="help-link"
            onClick={() =>
              toast.info(
                "For account or document support, contact your university administration.",
              )
            }
          >
            <LifeBuoy size={18} />
            {!collapsed && (
              <>
                Need a hand?
                <ArrowUpRight size={15} />
              </>
            )}
          </button>
          <div className="sidebar-profile">
            <Link href={`${base}/profile`} className="avatar">
              {initials}
            </Link>
            {!collapsed && (
              <div>
                <strong>{data.profile.full_name}</strong>
                <small>{staff ? "University Staff" : "Student account"}</small>
              </div>
            )}
            <button onClick={logout} title="Sign out" aria-label="Sign out">
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu"
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
            >
              <Menu size={22} />
            </button>
            <GraduationCap size={19} />
            <span>K.R. Mangalam University</span>
            <span className="breadcrumb-slash">/</span>
            <strong>{staff ? "Staff workspace" : "Student workspace"}</strong>
          </div>
          <div className="topbar-right">
            <span className="connection">
              <span className="live-dot" />
              {data.preview ? "Design preview" : "Secure connection"}
            </span>
            <div className="notification-wrap">
              <button
                className="notification-btn"
                aria-label="Recent notifications"
                onClick={() => setNotifications(!notifications)}
              >
                <Bell size={19} />
                {data.activities.length > 0 && <i />}
              </button>
              {notifications && (
                <div className="notifications">
                  <h4>Workspace updates</h4>
                  {data.activities.slice(0, 3).map((a) => (
                    <p key={a.id}>
                      {a.action.replaceAll("_", " ")}
                      <small>
                        {new Date(a.created_at).toLocaleDateString("en-IN", {
                          timeZone: "Asia/Kolkata",
                        })}
                      </small>
                    </p>
                  ))}
                  {!data.activities.length && <p>You’re all caught up.</p>}
                  <Link
                    href={`${base}/activity`}
                    onClick={() => setNotifications(false)}
                  >
                    View activity <ArrowUpRight size={14} />
                  </Link>
                </div>
              )}
            </div>
            <Link href={`${base}/profile`} className="avatar top-avatar">
              {initials}
            </Link>
          </div>
        </header>
        {data.preview && (
          <div className="preview-banner">
            <span>
              <b>Design preview</b> · Sample data. Cloud actions require a
              configured Supabase project.
            </span>
            <Link href="/login">
              Back to sign in <ArrowUpRight size={13} />
            </Link>
            <Link
              href={`${staff ? "/preview/student" : "/preview/staff"}/dashboard`}
            >
              View {staff ? "Student" : "Staff"} workspace
            </Link>
          </div>
        )}
        <main className="workspace-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {page === "dashboard" ? (
                <Dashboard data={data} base={base} />
              ) : page === "documents" ? (
                <Documents
                  data={data}
                  base={base}
                  search={search}
                  setSearch={setSearch}
                />
              ) : page === "issue" ? (
                <IssuePage data={data} />
              ) : page === "students" ? (
                <StudentDirectory data={data} base={base} />
              ) : page === "activity" ? (
                <ActivityPage data={data} />
              ) : page === "profile" ? (
                <ProfilePage data={data} />
              ) : page === "exports" ? (
                <ExportPage preview={data.preview} />
              ) : page === "detail" ? (
                <DocumentDetail data={data} id={id!} base={base} />
              ) : null}
            </motion.div>
          </AnimatePresence>
          <footer className="workspace-footer">
            <span>
              © {new Date().getFullYear()} CampusVault · K.R. Mangalam
              University
            </span>
            <span>
              <ShieldCheck size={13} />
              Built on trust. Secured in the cloud.
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
