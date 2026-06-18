import Link from "next/link";
import type { Prisma, BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatZar } from "@/lib/money";
import { parseTableParams, buildHref } from "@/lib/admin-table";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { StatusBadge, PayBadge } from "@/components/admin/badges";

export const dynamic = "force-dynamic";

type Row = {
  reference: string; customer: string; service: string; emoji: string; tint: string;
  area: string; scheduledAt: Date; createdAt: Date; status: BookingStatus; paymentStatus: string; totalCents: number; helper: string | null;
};

const STATUS_FILTERS: { key: string; label: string }[] = [
  { key: "", label: "All" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "HELPER_ASSIGNED", label: "Assigned" },
  { key: "EN_ROUTE", label: "En route" },
  { key: "IN_PROGRESS", label: "In progress" },
  { key: "COMPLETED", label: "Completed" },
  { key: "CANCELLED", label: "Cancelled" },
];

export default async function AdminBookingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  // Default to newest-booked first so a just-made booking is always at the top.
  const { page, pageSize, skip, take, q, sort, dir } = parseTableParams(sp, { defaultSort: "createdAt", defaultDir: "desc" });
  const statusFilter = sp.status && STATUS_FILTERS.some((s) => s.key === sp.status) ? (sp.status as BookingStatus) : undefined;
  const paid = sp.paid; // "1" paid, "0" unpaid

  const where: Prisma.BookingWhereInput = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(paid === "1" ? { paymentStatus: "PAID" } : paid === "0" ? { paymentStatus: "PENDING" } : {}),
    ...(q ? { OR: [
      { reference: { contains: q, mode: "insensitive" } },
      { customer: { fullName: { contains: q, mode: "insensitive" } } },
    ] } : {}),
  };

  const orderBy: Prisma.BookingOrderByWithRelationInput =
    sort === "totalCents" ? { totalCents: dir } : sort === "createdAt" ? { createdAt: dir } : { scheduledAt: dir };

  const [total, bookings] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where, orderBy, skip, take,
      include: {
        service: { select: { name: true, emoji: true, tint: true } },
        area: { select: { name: true } },
        customer: { select: { fullName: true } },
        helper: { select: { user: { select: { fullName: true } } } },
      },
    }),
  ]);

  const rows: Row[] = bookings.map((b) => ({
    reference: b.reference, customer: b.customer.fullName, service: b.service.name, emoji: b.service.emoji, tint: b.service.tint,
    area: b.area.name, scheduledAt: b.scheduledAt, createdAt: b.createdAt, status: b.status, paymentStatus: b.paymentStatus, totalCents: b.totalCents,
    helper: b.helper?.user.fullName ?? null,
  }));

  const columns: Column<Row>[] = [
    { key: "ref", header: "Reference", render: (r) => <span className="font-mono text-[12px] font-semibold text-indigo-brand">{r.reference}</span> },
    {
      key: "customer", header: "Customer", render: (r) => (
        <div className="min-w-0">
          <div className="truncate font-semibold text-ink">{r.customer}</div>
          <div className="truncate text-[11.5px] text-muted-faint">{r.helper ? `Cleaner: ${r.helper}` : "No cleaner yet"}</div>
        </div>
      ),
    },
    {
      key: "service", header: "Service", render: (r) => (
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg text-[14px]" style={{ background: r.tint }}>{r.emoji}</span>
          <div className="min-w-0"><div className="truncate text-[13px] font-medium text-ink">{r.service}</div><div className="truncate text-[11px] text-muted-faint">{r.area}</div></div>
        </div>
      ),
    },
    { key: "booked", header: "Booked", sortKey: "createdAt", render: (r) => <span className="text-[12.5px] text-muted">{r.createdAt.toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}</span> },
    { key: "when", header: "Clean date", sortKey: "scheduledAt", render: (r) => <span className="text-[12.5px] text-muted">{r.scheduledAt.toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}</span> },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "pay", header: "Payment", render: (r) => <PayBadge status={r.paymentStatus} /> },
    { key: "total", header: "Total", sortKey: "totalCents", align: "right", render: (r) => <span className="font-display tabular-nums font-bold text-ink">{formatZar(r.totalCents)}</span> },
  ];

  return (
    <div>
      <PageHeader title="Bookings" subtitle={`${total.toLocaleString()} booking${total === 1 ? "" : "s"}`} />

      {/* Payment filter (primary — answers "who has actually paid?") */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[11px] font-bold uppercase tracking-wide text-muted-label">Payment</span>
        {[{ key: undefined, label: "All" }, { key: "1", label: "Paid" }, { key: "0", label: "Awaiting payment" }].map((f) => {
          const on = (paid ?? "") === (f.key ?? "");
          return (
            <Link key={f.label} href={buildHref("/admin/bookings", sp, { paid: f.key, page: undefined })}
              className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-bold transition ${on ? "bg-money text-white" : "border border-line-input bg-white text-muted hover:bg-[#eef6f0]"}`}>
              {f.label}
            </Link>
          );
        })}
      </div>
      {/* Lifecycle status filter */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[11px] font-bold uppercase tracking-wide text-muted-label">Status</span>
        {STATUS_FILTERS.map((f) => {
          const on = (statusFilter ?? "") === f.key;
          return (
            <Link key={f.key} href={buildHref("/admin/bookings", sp, { status: f.key || undefined, page: undefined })}
              className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-bold transition ${on ? "bg-indigo-brand text-white" : "border border-line-input bg-white text-muted hover:bg-surface-lav"}`}>
              {f.label}
            </Link>
          );
        })}
      </div>

      <DataTable
        columns={columns} rows={rows} total={total} page={page} pageSize={pageSize}
        basePath="/admin/bookings" sp={sp} sort={sort} dir={dir}
        rowKey={(r) => r.reference} rowHref={(r) => `/admin/bookings/${r.reference}`}
        searchPlaceholder="Search reference or customer…"
        exportHref={buildHref("/admin/bookings/export", sp, { page: undefined })}
        emptyLabel={q ? `No bookings match “${q}”.` : "No bookings here."}
      />
    </div>
  );
}
