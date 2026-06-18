import Link from "next/link";
import { UserPlus, ChevronDown } from "lucide-react";
import type { Prisma, HelperStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { parseTableParams, buildHref } from "@/lib/admin-table";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type Column } from "@/components/admin/DataTable";

export const dynamic = "force-dynamic";
export const metadata = { title: "Helpers · Admin" };

type Row = {
  id: string; name: string; email: string; areas: string[]; status: HelperStatus;
  rating: number; completedJobs: number; createdAt: Date; bgChecked: boolean;
};

const STATUS_FILTERS: { key: string; label: string }[] = [
  { key: "", label: "All" },
  { key: "APPROVED", label: "Approved" },
  { key: "PENDING", label: "Pending" },
  { key: "IN_REVIEW", label: "In review" },
  { key: "REJECTED", label: "Rejected" },
];
const STATUS_STYLE: Record<HelperStatus, string> = {
  APPROVED: "bg-[#e6f6ed] text-money", PENDING: "bg-[#fdf0dc] text-orange-deep",
  IN_REVIEW: "bg-[#eef0fb] text-indigo-brand", REJECTED: "bg-[#fdeaea] text-red-500",
};

export default async function AdminHelpersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { page, pageSize, skip, take, q, sort, dir } = parseTableParams(sp, { defaultSort: "createdAt", defaultDir: "desc" });
  const statusFilter = sp.status && STATUS_FILTERS.some((s) => s.key === sp.status) ? (sp.status as HelperStatus) : undefined;
  const areaId = sp.area;

  const where: Prisma.HelperProfileWhereInput = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(areaId ? { areas: { some: { id: areaId } } } : {}),
    ...(q ? { user: { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } } : {}),
  };

  const orderBy: Prisma.HelperProfileOrderByWithRelationInput =
    sort === "rating" ? { rating: dir } : sort === "completedJobs" ? { completedJobs: dir } : sort === "name" ? { user: { fullName: dir } } : { createdAt: dir };

  const [total, helpers, areas, counts] = await Promise.all([
    prisma.helperProfile.count({ where }),
    prisma.helperProfile.findMany({ where, orderBy, skip, take, include: { user: { select: { fullName: true, email: true } }, areas: { select: { name: true } } } }),
    prisma.area.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.helperProfile.groupBy({ by: ["status"], _count: true }),
  ]);

  const countBy = new Map(counts.map((c) => [c.status, c._count]));
  const approvedCount = countBy.get("APPROVED") ?? 0;
  const activeArea = areas.find((a) => a.id === areaId);

  const rows: Row[] = helpers.map((h) => ({
    id: h.id, name: h.user.fullName, email: h.user.email, areas: h.areas.map((a) => a.name),
    status: h.status, rating: h.rating, completedJobs: h.completedJobs, createdAt: h.createdAt, bgChecked: h.backgroundCheckPassed,
  }));

  const columns: Column<Row>[] = [
    {
      key: "helper", header: "Helper", sortKey: "name", render: (r) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-gradient font-display text-[12.5px] font-bold text-white">{r.name[0]?.toUpperCase() ?? "?"}</div>
          <div className="min-w-0"><div className="truncate font-semibold text-ink">{r.name}</div><div className="truncate text-[12px] text-muted-faint">{r.email}</div></div>
        </div>
      ),
    },
    { key: "areas", header: "Areas", render: (r) => <span className="text-[12.5px] text-muted">{r.areas.length ? r.areas.slice(0, 3).join(", ") + (r.areas.length > 3 ? ` +${r.areas.length - 3}` : "") : "—"}</span> },
    { key: "status", header: "Status", render: (r) => <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_STYLE[r.status]}`}>{r.status === "IN_REVIEW" ? "In review" : r.status[0] + r.status.slice(1).toLowerCase()}</span> },
    { key: "rating", header: "Rating", sortKey: "rating", align: "right", render: (r) => <span className="tabular-nums font-semibold text-ink">{r.rating > 0 ? `⭐ ${r.rating.toFixed(1)}` : "—"}</span> },
    { key: "jobs", header: "Jobs", sortKey: "completedJobs", align: "right", render: (r) => <span className="tabular-nums font-semibold text-ink">{r.completedJobs}</span> },
    { key: "joined", header: "Joined", sortKey: "createdAt", align: "right", render: (r) => <span className="text-[12.5px] text-muted">{r.createdAt.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Helpers"
        subtitle={`${approvedCount} approved · ${total.toLocaleString()} ${statusFilter || areaId || q ? "matching" : "total"}`}
        actions={<Link href="/admin/helpers/new" className="inline-flex items-center gap-2 rounded-[12px] bg-brand-gradient px-4 py-2.5 text-[13.5px] font-bold text-white"><UserPlus size={16} /> Add helpers</Link>}
      />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((f) => {
          const on = (statusFilter ?? "") === f.key;
          return <Link key={f.key} href={buildHref("/admin/helpers", sp, { status: f.key || undefined, page: undefined })} className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-bold transition ${on ? "bg-indigo-brand text-white" : "border border-line-input bg-white text-muted hover:bg-surface-lav"}`}>{f.label}</Link>;
        })}
        <span className="mx-1 h-5 w-px bg-line-input" />
        <details className="relative">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-full border border-line-input bg-white px-3.5 py-1.5 text-[12.5px] font-bold text-muted transition hover:bg-surface-lav">
            {activeArea ? activeArea.name : "All areas"} <ChevronDown size={13} />
          </summary>
          <div className="absolute left-0 z-10 mt-1.5 max-h-72 w-52 overflow-y-auto rounded-[12px] border border-line bg-white p-1.5 shadow-[0_10px_30px_-12px_rgba(60,33,104,.3)]">
            <Link href={buildHref("/admin/helpers", sp, { area: undefined, page: undefined })} className={`block rounded-lg px-3 py-2 text-[13px] font-semibold transition hover:bg-surface-lav ${!areaId ? "text-magenta-brand" : "text-ink"}`}>All areas</Link>
            {areas.map((a) => (
              <Link key={a.id} href={buildHref("/admin/helpers", sp, { area: a.id, page: undefined })} className={`block rounded-lg px-3 py-2 text-[13px] font-semibold transition hover:bg-surface-lav ${areaId === a.id ? "text-magenta-brand" : "text-ink"}`}>{a.name}</Link>
            ))}
          </div>
        </details>
      </div>

      <DataTable
        columns={columns} rows={rows} total={total} page={page} pageSize={pageSize}
        basePath="/admin/helpers" sp={sp} sort={sort} dir={dir}
        rowKey={(r) => r.id} rowHref={(r) => `/admin/helpers/${r.id}`}
        searchPlaceholder="Search name or email…"
        emptyLabel={q || statusFilter || areaId ? "No helpers match these filters." : "No helpers yet — add your team to get started."}
      />
    </div>
  );
}
