"use client";
import { useMemo, useState, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Dialog } from "radix-ui";
import {
  FolderOpen,
  Check,
  X,
  ArrowUpRight,
  ArrowRight,
  UploadCloud,
  FileText,
  Download,
  Eye,
  Search,
  List,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  LockKeyhole,
  CalendarDays,
  SlidersHorizontal,
  MoreHorizontal,
  FileCheck2,
  AlertCircle,
  LoaderCircle,
  ClipboardCheck,
  CheckCheck,
  FileSpreadsheet,
  ArrowDownUp,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import {
  categories,
  type WorkspaceData,
  type DocumentRecord,
} from "@/lib/types";
import { date, fileSize } from "@/lib/utils";
import { uploadSchema, profileSchema } from "@/lib/security/validation";
const actionLabel = (s: string) =>
  s.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
function previewNotice() {
  toast.info(
    "This is a design preview. Connect Supabase and sign in to use this action.",
  );
}
export function Status({ status }: { status: string }) {
  return (
    <span className={`status status-${status}`}>
      <i />
      {status === "draft"
        ? "Draft"
        : status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
function FileIcon({ category }: { category?: string }) {
  return (
    <div
      className={`file-icon ${category === "Fee Receipt" ? "file-orange" : category === "Student Identity" ? "file-purple" : ""}`}
    >
      <FileText size={21} />
      <span>PDF</span>
    </div>
  );
}
async function openFile(d: DocumentRecord, preview: boolean, download = false) {
  if (preview) return previewNotice();
  try {
    const r = await fetch(
      `/api/documents/${d.id}/access?kind=${download ? "download" : "preview"}`,
    );
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    window.open(data.url, "_blank", "noopener,noreferrer");
  } catch (e) {
    toast.error((e as Error).message);
  }
}
export function Dashboard({
  data,
  base,
}: {
  data: WorkspaceData;
  base: string;
}) {
  const staff = data.profile.role === "staff";
  const docs = [...data.documents].sort(
    (a, b) =>
      new Date(staff ? b.created_at : b.issued_at || b.created_at).getTime() -
      new Date(staff ? a.created_at : a.issued_at || a.created_at).getTime(),
  );
  const total = docs.length;
  const issued = docs.filter((d) => d.status === "issued").length;
  const drafts = docs.filter((d) => d.status === "draft").length;
  const archived = docs.filter((d) => d.status === "archived").length;
  const revoked = docs.filter((d) => d.status === "revoked").length;
  const metrics = staff
    ? [
        {
          name: "Issued documents",
          value: issued,
          Icon: ShieldCheck,
          tone: "green",
          note: "Available to assigned students",
        },
        {
          name: "Draft documents",
          value: drafts,
          Icon: FileText,
          tone: "blue",
          note: "Visible to authorized Staff only",
        },
        {
          name: "Archived documents",
          value: archived,
          Icon: FolderOpen,
          tone: "orange",
          note: "Retained in the university inventory",
        },
        {
          name: "Revoked documents",
          value: revoked,
          Icon: AlertCircle,
          tone: "red",
          note: "Student access withdrawn",
        },
      ]
    : [
        {
          name: "Issued documents",
          value: total,
          Icon: FolderOpen,
          tone: "blue",
          note: "Issued to you by the university",
        },
        {
          name: "Academic records",
          value: docs.filter((d) => d.category === "Academic Marksheet").length,
          Icon: ShieldCheck,
          tone: "green",
          note: "Your academic milestones",
        },
        {
          name: "Certificates",
          value: docs.filter((d) => d.category === "Certificate").length,
          Icon: FileCheck2,
          tone: "orange",
          note: "Recognition, securely stored",
        },
        {
          name: "Document categories",
          value: new Set(docs.map((d) => d.category)).size,
          Icon: FolderOpen,
          tone: "blue",
          note: "An organized university vault",
        },
      ];
  const chart = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 6 + i);
    const key = d.toISOString().slice(0, 10);
    return {
      day: d.toLocaleDateString("en-IN", {
        weekday: "short",
        timeZone: "Asia/Kolkata",
      }),
      issuances: docs.filter((v) => v.issued_at?.slice(0, 10) === key).length,
    };
  });
  return (
    <>
      <div className="dashboard-intro">
        <div>
          <span className="eyebrow">
            {staff ? "DOCUMENT OPERATIONS" : "YOUR PERSONAL WORKSPACE"}
          </span>
          <h1>
            {staff
              ? "Official documents. Securely delivered."
              : `Welcome back, ${data.profile.full_name.split(" ")[0]}.`}{" "}
            {!staff && <span className="wave">✦</span>}
          </h1>
          <p>
            {staff
              ? "Issue and manage university documents within your authorized scope."
              : "Everything you need for your academic journey, securely in one place."}
          </p>
        </div>
        <div className="date-chip">
          <CalendarDays size={15} />
          {new Intl.DateTimeFormat("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            timeZone: "Asia/Kolkata",
          }).format(new Date())}
        </div>
      </div>
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-tag">
            <span className="live-dot" />
            {staff
              ? "YOUR ISSUANCE WORKSPACE"
              : "SAFE. ORGANIZED. ALWAYS ACCESSIBLE."}
          </span>
          <h2>
            {staff ? (
              <>
                Every milestone.
                <br />
                Officially issued.
              </>
            ) : (
              <>
                Big ambitions.
                <br />
                One secure workspace.
              </>
            )}
          </h2>
          <p>
            {staff
              ? "Assign official documents to students with a private, accountable issuance process."
              : "From your first admission letter to your final marksheet — we keep what matters, safe."}
          </p>
          <Link
            className="hero-link"
            href={`${base}/${staff ? "issue" : "documents"}`}
          >
            {staff ? "Issue a document" : "Explore my documents"}
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="hero-architecture" />
        <span className="hero-campus-label">
          <GraduationCap size={15} />
          K.R. Mangalam University<span>Academic workspace</span>
        </span>
      </section>
      <div className="metric-grid">
        {metrics.map(({ name, value, Icon, tone, note }) => (
          <section className="metric-card" key={name}>
            <div className={`metric-icon ${tone}`}>
              <Icon size={21} />
            </div>
            <span className="metric-name">{name}</span>
            <div className="metric-value">
              {String(value).padStart(2, "0")}
              <span>
                {name === "Total documents" || name === "Total submissions" ? (
                  <span className="metric-pill">
                    <LockKeyhole size={10} />
                    Private
                  </span>
                ) : null}
              </span>
            </div>
            <small>{note}</small>
          </section>
        ))}
      </div>
      <div className="dashboard-columns">
        <div className="dashboard-left">
          {staff ? (
            <section className="panel chart-panel">
              <div className="panel-title">
                <h3>Document issuance activity</h3>
                <span className="muted">Last 7 days</span>
              </div>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chart}>
                    <defs>
                      <linearGradient
                        id="chartFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0"
                          stopColor="#2563eb"
                          stopOpacity={0.2}
                        />
                        <stop offset="1" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#edf0f5" />
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                    />
                    <YAxis
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      width={26}
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                    />
                    <Tooltip />
                    <Area
                      dataKey="issuances"
                      stroke="#2563eb"
                      fill="url(#chartFill)"
                      strokeWidth={2.5}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>
          ) : (
            <DocumentCategories data={data} base={base} />
          )}
          <section className="panel recent-documents">
            <div className="panel-title">
              <div>
                <h3>
                  {staff
                    ? "Drafts ready to issue"
                    : "Recently issued documents"}
                </h3>
                <p>
                  {staff
                    ? "Manage drafts before releasing them to students."
                    : "Official university documents issued to you."}
                </p>
              </div>
              <Link href={`${base}/documents`}>
                View all
                <ArrowRight size={14} />
              </Link>
            </div>
            <div className="recent-table-wrap">
              <table className="recent-table">
                <thead>
                  <tr>
                    <th>DOCUMENT NAME</th>
                    <th>STATUS</th>
                    <th>{staff ? "CREATED" : "ISSUED ON"}</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {(staff ? docs.filter((d) => d.status === "draft") : docs)
                    .slice(0, 4)
                    .map((d) => (
                      <tr key={d.id}>
                        <td>
                          <Link
                            className="document-cell"
                            href={`${base}/documents/${d.id}`}
                          >
                            <FileIcon category={d.category} />
                            <div>
                              <strong>{d.title}</strong>
                              <small>
                                {d.category} <span>·</span>{" "}
                                {fileSize(d.file_size)}
                              </small>
                            </div>
                          </Link>
                        </td>
                        <td>
                          <Status status={d.status} />
                        </td>
                        <td className="table-date">
                          {date(d.issued_at || d.created_at)}
                        </td>
                        <td>
                          <button
                            className="icon-button"
                            aria-label={`View ${d.title}`}
                            onClick={() => openFile(d, data.preview)}
                          >
                            <ArrowUpRight size={17} />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {!docs.length && (
                <Empty
                  title="Your workspace starts here"
                  text="Your university-issued documents will appear here."
                />
              )}
            </div>
          </section>
        </div>
        <div className="dashboard-right">
          <section className="panel activity-panel">
            <div className="panel-title">
              <h3>Recent activity</h3>
              <Link href={`${base}/activity`} aria-label="View all activity">
                <ArrowUpRight size={17} />
              </Link>
            </div>
            <div className="activity-list">
              {data.activities.slice(0, 4).map((a) => (
                <div className="activity-item" key={a.id}>
                  <span
                    className={`activity-icon ${a.result === "denied" || a.action.includes("revoked") ? "red" : a.action.includes("issued") ? "green" : "blue"}`}
                  >
                    {a.result === "denied" ? (
                      <LockKeyhole size={14} />
                    ) : a.action.includes("issued") ? (
                      <Check size={15} />
                    ) : a.action.includes("revoked") ? (
                      <X size={15} />
                    ) : (
                      <UploadCloud size={15} />
                    )}
                  </span>
                  <div>
                    <strong>{actionLabel(a.action)}</strong>
                    <p>
                      {docs.find((d) => d.id === a.resource_id)?.title ||
                        "Secure workspace event"}
                    </p>
                    <small>{date(a.created_at)}</small>
                  </div>
                </div>
              ))}
              {!data.activities.length && (
                <p className="muted">
                  Your document activity will appear here.
                </p>
              )}
            </div>
            <Link className="activity-footer" href={`${base}/activity`}>
              View activity history
              <ArrowRight size={14} />
            </Link>
          </section>
          <section className="security-card">
            <div className="security-card-top">
              <span>
                <ShieldCheck size={23} />
              </span>
              <span className="security-pill">
                <i />
                Protected
              </span>
            </div>
            <h3>
              Your documents.
              <br />
              Your peace of mind.
            </h3>
            <p>
              Private storage and access controls keep your academic records in
              the right hands.
            </p>
            <div>
              <LockKeyhole size={13} />
              Only you & authorized university staff
            </div>
          </section>
        </div>
      </div>
      <div className="bottom-assurance">
        <ShieldCheck size={16} />
        <span>A little less paperwork. A lot more peace of mind.</span>
        <b>YOUR FUTURE, SECURELY FILED.</b>
      </div>
    </>
  );
}
function DocumentCategories({
  data,
  base,
}: {
  data: WorkspaceData;
  base: string;
}) {
  return (
    <section className="panel quick-upload">
      <div className="panel-title">
        <div>
          <h3>Your document categories</h3>
          <p>Official records, organized for your academic journey.</p>
        </div>
        <Link href={`${base}/documents`}>
          Browse all <ArrowRight size={14} />
        </Link>
      </div>
      <div className="vault-category-grid">
        {categories.map((category) => (
          <div key={category}>
            <FileText size={18} />
            <span>{category}</span>
            <b>
              {data.documents.filter((d) => d.category === category).length}
            </b>
          </div>
        ))}
      </div>
      <div className="upload-footnote">
        <LockKeyhole size={12} />
        Only documents officially issued to you appear in your vault.
      </div>
    </section>
  );
}
function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <FolderOpen size={32} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
export function Documents({
  data,
  base,
  search,
  setSearch,
}: {
  data: WorkspaceData;
  base: string;
  search: string;
  setSearch: (s: string) => void;
}) {
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [grid, setGrid] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "created_at", desc: true },
  ]);
  const staff = data.profile.role === "staff";
  const filtered = useMemo(
    () =>
      data.documents.filter(
        (d) =>
          (status === "all" || d.status === status) &&
          (category === "all" || d.category === category) &&
          `${d.title} ${d.owner?.full_name || ""} ${d.owner?.student_identifier || ""}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [data.documents, status, category, search],
  );
  const columns = useMemo<ColumnDef<DocumentRecord>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Document",
        cell: ({ row }) => (
          <Link
            className="document-cell"
            href={`${base}/documents/${row.original.id}`}
          >
            <FileIcon category={row.original.category} />
            <div>
              <strong>{row.original.title}</strong>
              <small>
                {row.original.category} · {fileSize(row.original.file_size)}
              </small>
            </div>
          </Link>
        ),
      },
      ...(staff
        ? [
            {
              id: "owner",
              header: "Student",
              cell: ({ row }: { row: { original: DocumentRecord } }) => (
                <div className="owner-cell">
                  <strong>{row.original.owner?.full_name || "Student"}</strong>
                  <small>{row.original.owner?.student_identifier}</small>
                </div>
              ),
            },
          ]
        : []),
      {
        id: "created_at",
        accessorFn: (d) => (staff ? d.created_at : d.issued_at || d.created_at),
        header: staff ? "Created" : "Issued on",
        cell: ({ getValue }) => date(getValue() as string),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => <Status status={getValue() as string} />,
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="table-actions">
            <button
              title="Preview"
              aria-label={`Preview ${row.original.title}`}
              onClick={() => openFile(row.original, data.preview)}
            >
              <Eye size={16} />
            </button>
            <button
              title="Download"
              aria-label={`Download ${row.original.title}`}
              onClick={() => openFile(row.original, data.preview, true)}
            >
              <Download size={16} />
            </button>
            {staff && (
              <Link
                className="review-link"
                href={`${base}/documents/${row.original.id}`}
              >
                Manage
                <ArrowUpRight size={13} />
              </Link>
            )}
          </div>
        ),
      },
    ],
    [base, staff, data.preview],
  );
  // TanStack Table intentionally owns mutable table state; React Compiler is not enabled.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 8 } },
  });
  return (
    <>
      <PageHeading
        eyebrow={staff ? "DOCUMENT OPERATIONS" : "YOUR DOCUMENT LIBRARY"}
        title={staff ? "Document inventory" : "My documents"}
        description={
          staff
            ? "Manage drafts and the lifecycle of documents in your authorized scopes."
            : "Official documents issued to you by the university."
        }
      >
        {staff && (
          <Button asChild>
            <Link href={`${base}/issue`}>
              <UploadCloud size={16} />
              Issue document
            </Link>
          </Button>
        )}
      </PageHeading>
      <section className="panel document-workspace">
        <div className="document-tabs">
          {(staff
            ? [
                ["all", "All documents"],
                ["draft", "Draft"],
                ["issued", "Issued"],
                ["archived", "Archived"],
                ["revoked", "Revoked"],
              ]
            : [
                ["all", "All documents"],
                ["issued", "Issued"],
              ]
          ).map(([key, label]) => (
            <button
              key={key}
              className={status === key ? "selected" : ""}
              onClick={() => {
                setStatus(key);
                table.setPageIndex(0);
              }}
            >
              {label}
              <span>
                {
                  data.documents.filter(
                    (d) => key === "all" || d.status === key,
                  ).length
                }
              </span>
            </button>
          ))}
        </div>
        <div className="filter-toolbar">
          <div className="search-field">
            <Search size={17} />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                table.setPageIndex(0);
              }}
              placeholder={
                staff
                  ? "Search documents, students or ID..."
                  : "Search your documents..."
              }
              aria-label="Search documents"
            />
          </div>
          <label className="select-filter">
            <SlidersHorizontal size={15} />
            <select
              aria-label="Document category"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                table.setPageIndex(0);
              }}
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <button
            className="sort-toggle"
            onClick={() =>
              setSorting([{ id: "created_at", desc: !sorting[0]?.desc }])
            }
          >
            <ArrowDownUp size={15} />
            {sorting[0]?.desc ? "Newest first" : "Oldest first"}
          </button>
          <div className="view-toggle">
            <button
              className={!grid ? "selected" : ""}
              onClick={() => setGrid(false)}
              aria-label="List view"
            >
              <List size={17} />
            </button>
            <button
              className={grid ? "selected" : ""}
              onClick={() => setGrid(true)}
              aria-label="Grid view"
            >
              <LayoutGrid size={17} />
            </button>
          </div>
        </div>
        {filtered.length ? (
          grid ? (
            <div className="document-grid">
              {table.getRowModel().rows.map(({ original: d }) => (
                <article className="document-grid-card" key={d.id}>
                  <div>
                    <FileIcon category={d.category} />
                    <Status status={d.status} />
                  </div>
                  <Link href={`${base}/documents/${d.id}`}>
                    <h3>{d.title}</h3>
                  </Link>
                  <p>{d.category}</p>
                  <small>
                    {date(d.issued_at || d.created_at)} ·{" "}
                    {fileSize(d.file_size)}
                  </small>
                  <div className="grid-card-actions">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openFile(d, data.preview)}
                    >
                      <Eye size={14} />
                      Preview
                    </Button>
                    <button
                      className="icon-button"
                      aria-label="Download document"
                      onClick={() => openFile(d, data.preview, true)}
                    >
                      <Download size={16} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  {table.getHeaderGroups().map((g) => (
                    <tr key={g.id}>
                      {g.headers.map((h) => (
                        <th key={h.id}>
                          <button onClick={h.column.getToggleSortingHandler()}>
                            {flexRender(
                              h.column.columnDef.header,
                              h.getContext(),
                            )}
                            {h.column.getCanSort() && <ChevronDown size={12} />}
                          </button>
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((r) => (
                    <tr key={r.id}>
                      {r.getVisibleCells().map((c) => (
                        <td key={c.id}>
                          {flexRender(c.column.columnDef.cell, c.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <Empty
            title="No documents found"
            text="Try a different search or filter."
          />
        )}
        <div className="pagination">
          <span>
            {filtered.length} document{filtered.length !== 1 ? "s" : ""} · Page{" "}
            {table.getState().pagination.pageIndex + 1} of{" "}
            {Math.max(1, table.getPageCount())}
          </span>
          <div>
            <button
              aria-label="Previous page"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              aria-label="Next page"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
export function IssuePage({ data }: { data: WorkspaceData }) {
  const preview = data.preview;
  const preselected = useSearchParams().get("student") || "";
  const [recipient, setRecipient] = useState(preselected);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<z.infer<typeof uploadSchema>>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      initial_status: "draft",
      student_id: preselected,
      scope_id:
        data.memberships?.find(
          (m) =>
            m.user_id === preselected &&
            m.membership_type === "student" &&
            data.memberships?.some(
              (s) =>
                s.user_id === data.profile.id &&
                s.scope_id === m.scope_id &&
                s.membership_type === "staff",
            ),
        )?.scope_id || "",
    },
  });
  function choose(f?: File) {
    if (!f) return;
    if (
      !["application/pdf", "image/jpeg", "image/png"].includes(f.type) ||
      f.size > 10485760 ||
      !f.size
    ) {
      toast.error("Choose a PDF, JPG or PNG file up to 10 MB.");
      return;
    }
    setFile(f);
  }
  async function submit(values: z.infer<typeof uploadSchema>) {
    if (preview) return previewNotice();
    if (!file) return toast.error("Please attach a document.");
    setBusy(true);
    setProgress(0);
    try {
      const prepared = await fetch("/api/documents/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          type: file.type,
          size: file.size,
          student_id: values.student_id,
          scope_id: values.scope_id,
        }),
      });
      const upload = await prepared.json();
      if (!prepared.ok) throw new Error(upload.error);
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", upload.url);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.setRequestHeader("x-upsert", "false");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable)
            setProgress(Math.round((e.loaded / e.total) * 90));
        };
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(new Error("Upload failed. Please try again."));
        xhr.onerror = () =>
          reject(new Error("Connection interrupted. Please try again."));
        xhr.send(file);
      });
      setProgress(95);
      const completed = await fetch("/api/documents/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          id: upload.id,
          name: file.name,
          type: file.type,
        }),
      });
      const result = await completed.json();
      if (!completed.ok) throw new Error(result.error);
      setProgress(100);
      toast.success("Document securely saved in the university vault.");
      reset();
      setFile(null);
      router.push(`/staff/documents/${result.id}`);
      router.refresh();
    } catch (e) {
      setProgress(0);
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="OFFICIAL UNIVERSITY RECORDS"
        title="Issue a document"
        description="Assign an official document to a student in your authorized scope."
      />
      <div className="upload-layout">
        <form className="panel upload-form" onSubmit={handleSubmit(submit)}>
          <div className="panel-title">
            <div>
              <h3>Document details</h3>
              <p>Tell us a little about your document.</p>
            </div>
            <span className="step-badge">01 — 02</span>
          </div>
          <label>
            Assign to student
            <select
              {...register("student_id")}
              onChange={(e) => {
                setRecipient(e.target.value);
                setValue("student_id", e.target.value);
                setValue("scope_id", "");
              }}
            >
              <option value="" disabled>
                Select a student
              </option>
              {data.students?.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.full_name} ·{" "}
                  {student.student_identifier || student.email}
                </option>
              ))}
            </select>
            {errors.student_id && (
              <small className="field-error">Choose a student.</small>
            )}
          </label>
          <label>
            Issuance scope
            <select {...register("scope_id")}>
              <option value="" disabled>
                Select an authorized scope
              </option>
              {data.scopes
                ?.filter(
                  (scope) =>
                    data.memberships?.some(
                      (m) =>
                        m.user_id === recipient &&
                        m.scope_id === scope.id &&
                        m.membership_type === "student",
                    ) &&
                    data.memberships?.some(
                      (m) =>
                        m.user_id === data.profile.id &&
                        m.scope_id === scope.id &&
                        m.membership_type === "staff",
                    ),
                )
                .map((scope) => (
                  <option key={scope.id} value={scope.id}>
                    {scope.name}
                  </option>
                ))}
            </select>
            {errors.scope_id && (
              <small className="field-error">
                Choose a scope shared with this student.
              </small>
            )}
          </label>
          <label>
            Save as
            <select {...register("initial_status")}>
              <option value="draft">Draft — Staff only</option>
              <option value="issued">
                Issued — available to the assigned student
              </option>
            </select>
          </label>
          <label>
            Document title
            <input
              {...register("title")}
              placeholder="e.g. Semester 4 Marksheet"
            />
            {errors.title && (
              <small className="field-error">{errors.title.message}</small>
            )}
          </label>
          <label>
            Document category
            <select {...register("category")} defaultValue="">
              <option value="" disabled>
                Select a category
              </option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            {errors.category && (
              <small className="field-error">Choose a document category.</small>
            )}
          </label>
          <label>
            Description <span className="optional">(optional)</span>
            <textarea
              {...register("description")}
              rows={3}
              placeholder="Optional description for the student."
            />
            {errors.description && (
              <small className="field-error">
                {errors.description.message}
              </small>
            )}
          </label>
          <label>Attach your document</label>
          <input
            ref={input}
            type="file"
            hidden
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => choose(e.target.files?.[0])}
          />
          <button
            type="button"
            className={`upload-dropzone ${drag ? "drag-active" : ""}`}
            onClick={() => input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              choose(e.dataTransfer.files[0]);
            }}
          >
            <span className="upload-icon">
              <UploadCloud size={29} />
            </span>
            <strong>
              {file ? (
                file.name
              ) : (
                <>
                  Drop your file here, or <span>browse files</span>
                </>
              )}
            </strong>
            <small>
              {file
                ? fileSize(file.size)
                : "PDF, JPG or PNG · Maximum size: 10 MB"}
            </small>
          </button>
          {file && (
            <button
              type="button"
              className="remove-file"
              onClick={() => setFile(null)}
            >
              <X size={13} />
              Remove attachment
            </button>
          )}
          {busy && (
            <div
              className="upload-progress"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span style={{ width: `${progress}%` }} />
              <small>
                {progress}% ·{" "}
                {progress >= 95 ? "Securing your document..." : "Uploading..."}
              </small>
            </div>
          )}
          <div className="upload-form-footer">
            <span>
              <LockKeyhole size={13} />
              Private & securely stored
            </span>
            <Button disabled={busy} type="submit">
              {busy ? (
                <LoaderCircle size={16} className="spin" />
              ) : (
                <UploadCloud size={16} />
              )}
              Save document
            </Button>
          </div>
        </form>
        <aside className="upload-aside">
          <div className="panel">
            <span className="metric-icon blue">
              <ShieldCheck size={23} />
            </span>
            <h3>In safe hands.</h3>
            <p>
              Drafts are private to authorized Staff. Only Issued documents
              become visible to the assigned student.
            </p>
            <div className="upload-steps">
              <div>
                <b>1</b>
                <span>
                  <strong>Select the recipient</strong>
                  <small>Choose a student in your issuance scope.</small>
                </span>
              </div>
              <div>
                <b>2</b>
                <span>
                  <strong>Upload the official record</strong>
                  <small>Save privately as a draft or issue immediately.</small>
                </span>
              </div>
              <div>
                <b>3</b>
                <span>
                  <strong>Manage its lifecycle</strong>
                  <small>Archive or revoke access with an audit trail.</small>
                </span>
              </div>
            </div>
          </div>
          <p>
            <AlertCircle size={15} />
            For this academic project, use dummy documents without real personal
            information.
          </p>
        </aside>
      </div>
    </>
  );
}
export function ActivityPage({ data }: { data: WorkspaceData }) {
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("all");
  const [result, setResult] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<string | null>(null);
  const filtered = data.activities.filter(
    (a) =>
      (action === "all" || a.action === action) &&
      (result === "all" || a.result === result) &&
      (!from || a.created_at.slice(0, 10) >= from) &&
      (!to || a.created_at.slice(0, 10) <= to) &&
      `${a.action} ${a.resource_type} ${a.id}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        eyebrow="TRANSPARENCY, BUILT IN"
        title={
          data.profile.role === "staff"
            ? "Activity & security logs"
            : "Your activity history"
        }
        description="Every important action, securely recorded."
      />
      <div className="activity-summary">
        <div>
          <span className="metric-icon blue">
            <ActivityIcon />
          </span>
          <div>
            <strong>{data.activities.length}</strong>
            <small>Recorded events</small>
          </div>
        </div>
        <div>
          <span className="metric-icon green">
            <CheckCheck size={21} />
          </span>
          <div>
            <strong>
              {data.activities.filter((a) => a.result === "success").length}
            </strong>
            <small>Successful actions</small>
          </div>
        </div>
        <div>
          <span className="metric-icon red">
            <LockKeyhole size={21} />
          </span>
          <div>
            <strong>
              {data.activities.filter((a) => a.result === "denied").length}
            </strong>
            <small>Access restrictions enforced</small>
          </div>
        </div>
      </div>
      <section className="panel">
        <div className="filter-toolbar wrap">
          <div className="search-field">
            <Search size={17} />
            <input
              aria-label="Search activity"
              placeholder="Search activity..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <select
            aria-label="Action filter"
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(0);
            }}
          >
            <option value="all">All actions</option>
            {[...new Set(data.activities.map((a) => a.action))].map((a) => (
              <option value={a} key={a}>
                {actionLabel(a)}
              </option>
            ))}
          </select>
          <select
            aria-label="Result filter"
            value={result}
            onChange={(e) => {
              setResult(e.target.value);
              setPage(0);
            }}
          >
            <option value="all">All results</option>
            <option value="success">Success</option>
            <option value="denied">Denied</option>
            <option value="failure">Failure</option>
          </select>
          <label className="date-filter">
            From
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(0);
              }}
            />
          </label>
          <label className="date-filter">
            To
            <input
              type="date"
              min={from}
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(0);
              }}
            />
          </label>
        </div>
        <div className="table-scroll">
          <table className="data-table activity-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Resource</th>
                <th>Result</th>
                <th>Time</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(page * 10, page * 10 + 10).map((a) => (
                <tr key={a.id}>
                  <td>
                    <div className="audit-event">
                      <span
                        className={`activity-icon ${a.result === "denied" ? "red" : "blue"}`}
                      >
                        <ShieldCheck size={15} />
                      </span>
                      <strong>{actionLabel(a.action)}</strong>
                    </div>
                  </td>
                  <td className="muted">{a.resource_type}</td>
                  <td>
                    <Status status={a.result} />
                  </td>
                  <td>
                    {date(a.created_at)}
                    <small className="time-small">
                      {new Date(a.created_at).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Asia/Kolkata",
                      })}
                    </small>
                  </td>
                  <td>
                    <button
                      className="icon-button"
                      aria-label="Event details"
                      onClick={() => setDetail(detail === a.id ? null : a.id)}
                    >
                      <MoreHorizontal size={18} />
                    </button>
                    {detail === a.id && (
                      <div className="event-details">
                        <strong>Event ID</strong>
                        <code>{a.id}</code>
                        <strong>Resource ID</strong>
                        <code>{a.resource_id || "—"}</code>
                        <strong>Safe metadata</strong>
                        <code>{JSON.stringify(a.metadata)}</code>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && (
          <Empty
            title="No activity found"
            text="Activity will appear as you use your workspace."
          />
        )}
        <div className="pagination">
          <span>
            {filtered.length} events · Page {page + 1}
          </span>
          <div>
            <button
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              disabled={(page + 1) * 10 >= filtered.length}
              onClick={() => setPage(page + 1)}
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
function ActivityIcon() {
  return <ClipboardCheck size={21} />;
}
export function ProfilePage({ data }: { data: WorkspaceData }) {
  const [busy, setBusy] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: data.profile.full_name,
      department: data.profile.department || "",
    },
  });
  const router = useRouter();
  async function save(values: z.infer<typeof profileSchema>) {
    if (data.preview) return previewNotice();
    setBusy(true);
    try {
      const r = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast.success("Profile updated.");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="MAKE YOURSELF AT HOME"
        title="My profile"
        description="Your university identity, in one place."
      />
      <section className="panel profile-panel">
        <div className="profile-cover" />
        <div className="profile-identity">
          <span className="avatar">
            {data.profile.full_name
              .split(" ")
              .map((s) => s[0])
              .join("")
              .slice(0, 2)}
          </span>
          <div>
            <h2>{data.profile.full_name}</h2>
            <p>{data.profile.email}</p>
          </div>
          <span className="role-badge">
            <ShieldCheck size={14} />
            {data.profile.role}
          </span>
        </div>
        <form onSubmit={handleSubmit(save)} className="profile-form">
          <h3>Personal information</h3>
          <p className="muted">Keep your name and department up to date.</p>
          <div className="form-grid">
            <label>
              Full name
              <input {...register("full_name")} />
              {errors.full_name && (
                <small className="field-error">
                  {errors.full_name.message}
                </small>
              )}
            </label>
            <label>
              Department / program
              <input {...register("department")} />
              {errors.department && (
                <small className="field-error">
                  {errors.department.message}
                </small>
              )}
            </label>
            <label>
              Email address
              <input value={data.profile.email} disabled />
            </label>
            <label>
              {data.profile.role === "student"
                ? "Student identifier"
                : "Account role"}
              <input
                value={data.profile.student_identifier || "University Staff"}
                disabled
              />
            </label>
          </div>
          <div className="profile-info">
            <LockKeyhole size={16} />
            Your role, email, and issuance scope are managed by the university.
          </div>
          <div className="upload-form-footer">
            <small className="muted">
              Member since {date(data.profile.created_at)}
            </small>
            <Button type="submit" disabled={busy}>
              {busy && <LoaderCircle size={16} className="spin" />}Save changes
            </Button>
          </div>
        </form>
      </section>
    </>
  );
}
export function ExportPage({ preview }: { preview: boolean }) {
  const [kind, setKind] = useState("documents");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  async function download() {
    if (preview) return previewNotice();
    setBusy(true);
    try {
      const params = new URLSearchParams({ kind, status, from, to });
      const r = await fetch(`/api/exports?${params}`);
      if (!r.ok) {
        const d = await r.json();
        throw new Error(d.error);
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `campusvault-${kind}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Secure CSV export downloaded.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="INSTITUTIONAL RECORDS"
        title="Export center"
        description="The records you need. Only the records you’re authorized to see."
      />
      <div className="export-layout">
        <section className="panel export-form">
          <div className="panel-title">
            <div>
              <h3>Create a secure export</h3>
              <p>Download permitted records as a spreadsheet-ready CSV.</p>
            </div>
            <span className="metric-icon blue">
              <FileSpreadsheet size={23} />
            </span>
          </div>
          <label>What would you like to export?</label>
          <div className="export-options">
            {[
              [
                "documents",
                "Document metadata",
                "Titles, categories, owners and issuance status",
                FileText,
              ],
              [
                "activity",
                "Activity & audit logs",
                "Permitted actions, timestamps and security events",
                ShieldCheck,
              ],
            ].map(([v, t, s, Icon]) => {
              const I = Icon as typeof FileText;
              return (
                <button
                  key={v as string}
                  className={kind === v ? "selected" : ""}
                  onClick={() => setKind(v as string)}
                >
                  <I size={22} />
                  <span>
                    <strong>{t as string}</strong>
                    <small>{s as string}</small>
                  </span>
                  <i>{kind === v && <Check size={12} />}</i>
                </button>
              );
            })}
          </div>
          <div className="form-grid">
            <label>
              From date
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label>
              To date
              <input
                type="date"
                min={from}
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
          </div>
          {kind === "documents" && (
            <label>
              Document status
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="draft">Draft</option>
                <option value="issued">Issued</option>
                <option value="archived">Archived</option>
                <option value="revoked">Revoked</option>
              </select>
            </label>
          )}
          <div className="profile-info">
            <LockKeyhole size={16} />
            Exports contain metadata only. Document file contents are never
            included.
          </div>
          <Button
            disabled={busy || Boolean(from && to && from > to)}
            onClick={download}
          >
            {busy ? (
              <LoaderCircle size={16} className="spin" />
            ) : (
              <Download size={16} />
            )}
            Generate & download CSV
          </Button>
        </section>
        <aside className="upload-aside">
          <div className="panel">
            <span className="metric-icon green">
              <ShieldCheck size={23} />
            </span>
            <h3>Accountable by design.</h3>
            <p>
              Every export checks your issuance scope and records an audit
              event. Spreadsheet formula characters are safely escaped.
            </p>
            <hr />
            <h4>Export ≠ full backup</h4>
            <p>
              A CSV preserves metadata, not your database or private files. See
              the project’s backup guide for complete recovery procedures.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
export function DocumentDetail({
  data,
  id,
  base,
}: {
  data: WorkspaceData;
  id: string;
  base: string;
}) {
  const doc = data.documents.find((d) => d.id === id);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [decision, setDecision] = useState<"issued" | "archived" | "revoked">(
    "issued",
  );
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const staff = data.profile.role === "staff";
  if (!doc)
    return (
      <Empty
        title="Document unavailable"
        text="This document is unavailable or you don’t have permission to view it."
      />
    );
  async function preview() {
    if (data.preview) return previewNotice();
    setBusy(true);
    try {
      const r = await fetch(`/api/documents/${id}/access?kind=preview`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setUrl(d.url);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function changeStatus() {
    if (data.preview) return previewNotice();
    setBusy(true);
    try {
      const r = await fetch(`/api/documents/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expected_status: doc!.status,
          status: decision,
          remarks,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast.success(`Document ${decision}.`);
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link href={`${base}/documents`} className="back-link">
        <ChevronLeft size={15} />
        Back to documents
      </Link>
      <PageHeading
        eyebrow={doc.category.toUpperCase()}
        title={doc.title}
        description={`${doc.issued_at ? "Issued " + date(doc.issued_at) : "Created " + date(doc.created_at)} · ${fileSize(doc.file_size)}`}
      >
        <Button
          variant="outline"
          onClick={() => openFile(doc, data.preview, true)}
        >
          <Download size={16} />
          Download
        </Button>
      </PageHeading>
      <div className="detail-layout">
        <section className="panel preview-panel">
          <div className="panel-title">
            <h3>Document preview</h3>
            <span>
              <LockKeyhole size={13} />
              Private file
            </span>
          </div>
          {url ? (
            <iframe
              title="Authorized document preview"
              src={url}
              className="document-iframe"
            />
          ) : (
            <div className="preview-empty">
              <span className="large-document-icon">
                <FileText size={62} />
              </span>
              <h3>{doc.original_filename}</h3>
              <p>
                {data.preview
                  ? "Sample document · design preview only"
                  : "Open a secure preview, available for 60 seconds."}
              </p>
              <Button variant="outline" disabled={busy} onClick={preview}>
                {busy ? (
                  <LoaderCircle size={16} className="spin" />
                ) : (
                  <Eye size={16} />
                )}
                Open secure preview
              </Button>
              <small>
                <ShieldCheck size={13} />
                Access is authorized and recorded
              </small>
            </div>
          )}
          {url && (
            <button className="refresh-preview" onClick={preview}>
              Preview expired? Refresh secure link
            </button>
          )}
        </section>
        <aside className="detail-info">
          <section className="panel">
            <div className="panel-title">
              <h3>Document information</h3>
              <Status status={doc.status} />
            </div>
            <dl>
              <dt>Document category</dt>
              <dd>{doc.category}</dd>
              <dt>Assigned student</dt>
              <dd>{doc.owner?.full_name || data.profile.full_name}</dd>
              <dt>Student identifier</dt>
              <dd>
                {doc.owner?.student_identifier ||
                  data.profile.student_identifier ||
                  "—"}
              </dd>
              <dt>File name</dt>
              <dd>{doc.original_filename}</dd>
              <dt>Size & type</dt>
              <dd>
                {fileSize(doc.file_size)} · {doc.mime_type}
              </dd>
              <dt>Uploaded on</dt>
              <dd>{date(doc.created_at)}</dd>
              {doc.description && (
                <>
                  <dt>Description</dt>
                  <dd>{doc.description}</dd>
                </>
              )}
              {doc.issued_at && (
                <>
                  <dt>Issued on</dt>
                  <dd>{date(doc.issued_at)}</dd>
                </>
              )}
              {doc.lifecycle_remarks && (
                <>
                  <dt>Lifecycle remarks</dt>
                  <dd className="review-remarks">{doc.lifecycle_remarks}</dd>
                </>
              )}
            </dl>
            {staff && (
              <>
                {doc.legacy_status && (
                  <p className="profile-info">
                    Preserved legacy student submission · previous status:{" "}
                    {doc.legacy_status}. This record cannot be issued.
                  </p>
                )}
                <div className="review-buttons">
                  {(doc.status === "draft"
                    ? ["issued", "archived"]
                    : doc.status === "issued"
                      ? ["archived", "revoked"]
                      : doc.status === "archived" && doc.issued_by
                        ? ["revoked"]
                        : []
                  ).map((status) => (
                    <Button
                      key={status}
                      variant={status === "revoked" ? "destructive" : "outline"}
                      onClick={() => {
                        setDecision(status as typeof decision);
                        setRemarks("");
                        setOpen(true);
                      }}
                    >
                      {status === "issued"
                        ? "Issue document"
                        : status === "archived"
                          ? "Archive document"
                          : "Revoke document"}
                    </Button>
                  ))}
                </div>
              </>
            )}
          </section>
          <section className="panel document-history">
            <h3>Document history</h3>
            {data.activities
              .filter((a) => a.resource_id === id)
              .map((a) => (
                <div key={a.id}>
                  <span className="activity-icon blue">
                    <FileCheck2 size={15} />
                  </span>
                  <p>
                    <strong>{actionLabel(a.action)}</strong>
                    <small>{date(a.created_at)}</small>
                  </p>
                </div>
              ))}
            {!data.activities.some((a) => a.resource_id === id) && (
              <p className="muted">No permitted activity records yet.</p>
            )}
          </section>
        </aside>
      </div>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog-content">
            <Dialog.Title>
              {`${decision === "issued" ? "Issue" : decision === "archived" ? "Archive" : "Revoke"} this document?`}
            </Dialog.Title>
            <Dialog.Description>
              {decision === "issued"
                ? "This official document will become accessible to the assigned student."
                : "This document will no longer be accessible to the student. Provide a reason for the audit record."}
            </Dialog.Description>
            <label>
              Lifecycle remarks{" "}
              {decision !== "issued" ? "(required)" : "(optional)"}
              <textarea
                rows={4}
                maxLength={1000}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add feedback for the student..."
              />
            </label>
            <div className="dialog-actions">
              <Dialog.Close asChild>
                <Button variant="outline">Cancel</Button>
              </Dialog.Close>
              <Button
                disabled={
                  busy || (decision !== "issued" && remarks.trim().length < 5)
                }
                onClick={changeStatus}
                variant={decision === "revoked" ? "destructive" : "default"}
              >
                {busy && <LoaderCircle className="spin" size={16} />}Confirm{" "}
                {decision === "issued"
                  ? "issuance"
                  : decision === "archived"
                    ? "archive"
                    : "revocation"}
              </Button>
            </div>
            <Dialog.Close className="dialog-close" aria-label="Close dialog">
              <X size={18} />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

export function StudentDirectory({
  data,
  base,
}: {
  data: WorkspaceData;
  base: string;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const students = (data.students || []).filter((s) =>
    `${s.full_name} ${s.email} ${s.student_identifier || ""} ${s.department || ""}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        eyebrow="YOUR AUTHORIZED STUDENTS"
        title="Student directory"
        description="Find a student and securely issue an official university document."
      />
      <section className="panel">
        <div className="filter-toolbar">
          <div className="search-field">
            <Search size={17} />
            <input
              value={query}
              aria-label="Search students"
              placeholder="Search name, student identifier, department or email..."
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <span className="muted">{students.length} students</span>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Identifier</th>
                <th>Department</th>
                <th>Issued documents</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {students.slice(page * 10, page * 10 + 10).map((student) => (
                <tr key={student.id}>
                  <td>
                    <div className="owner-cell">
                      <strong>{student.full_name}</strong>
                      <small>{student.email}</small>
                    </div>
                  </td>
                  <td>{student.student_identifier || "—"}</td>
                  <td>{student.department || "—"}</td>
                  <td>
                    {
                      data.documents.filter(
                        (d) =>
                          d.owner_id === student.id && d.status === "issued",
                      ).length
                    }
                  </td>
                  <td>
                    <Button asChild size="sm" variant="outline">
                      <Link
                        href={`${base}/issue?student=${encodeURIComponent(student.id)}`}
                      >
                        <UploadCloud size={14} />
                        Issue document
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!students.length && (
          <Empty
            title="No students found"
            text="Only students in your assigned issuance scopes are listed."
          />
        )}
        <div className="pagination">
          <span>
            Page {page + 1} · {students.length} students
          </span>
          <div>
            <button
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              disabled={(page + 1) * 10 >= students.length}
              onClick={() => setPage(page + 1)}
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
