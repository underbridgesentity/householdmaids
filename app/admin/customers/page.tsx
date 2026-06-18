import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { formatZar } from "@/lib/money";
import { parseTableParams, buildHref } from "@/lib/admin-table";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type Column } from "@/components/admin/DataTable";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  createdAt: Date;
  bookings: number;
  paidCents: number;
  walletCents: number;
  referred: boolean;
};

export default async function AdminCustomersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { page, pageSize, skip, take, q, sort, dir } = parseTableParams(sp, { defaultSort: "createdAt", defaultDir: "desc" });

  const where: Prisma.UserWhereInput = {
    role: "CUSTOMER",
    ...(q
      ? { OR: [
          { fullName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
        ] }
      : {}),
  };

  const orderBy: Prisma.UserOrderByWithRelationInput =
    sort === "fullName" ? { fullName: dir } : { createdAt: dir };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where, orderBy, skip, take,
      select: {
        id: true, fullName: true, email: true, phone: true, createdAt: true,
        _count: { select: { bookings: true } },
        referredBy: { select: { id: true } },
      },
    }),
  ]);

  // Per-page aggregates (scoped to the 25 visible ids — cheap at any scale).
  const ids = users.map((u) => u.id);
  const [paidAgg, walletAgg] = ids.length
    ? await Promise.all([
        prisma.booking.groupBy({ by: ["customerId"], where: { customerId: { in: ids }, paymentStatus: "PAID", status: { not: "CANCELLED" } }, _sum: { totalCents: true } }),
        prisma.walletTransaction.groupBy({ by: ["userId"], where: { userId: { in: ids }, status: { in: ["EARNED", "PAID"] } }, _sum: { amountCents: true } }),
      ])
    : [[], []];
  const paidBy = new Map(paidAgg.map((r) => [r.customerId, r._sum.totalCents ?? 0]));
  const walletBy = new Map(walletAgg.map((r) => [r.userId, r._sum.amountCents ?? 0]));

  const rows: Row[] = users.map((u) => ({
    id: u.id, fullName: u.fullName, email: u.email, phone: u.phone, createdAt: u.createdAt,
    bookings: u._count.bookings, paidCents: paidBy.get(u.id) ?? 0, walletCents: walletBy.get(u.id) ?? 0,
    referred: !!u.referredBy,
  }));

  const columns: Column<Row>[] = [
    {
      key: "customer", header: "Customer", sortKey: "fullName",
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-brand to-magenta-brand font-display text-[12.5px] font-bold text-white">{r.fullName[0]?.toUpperCase() ?? "?"}</div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 truncate font-semibold text-ink">{r.fullName}{r.referred && <span className="rounded bg-surface-pink px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-magenta-brand">Ref</span>}</div>
            <div className="truncate text-[12px] text-muted-faint">{r.email}</div>
          </div>
        </div>
      ),
    },
    { key: "phone", header: "Phone", render: (r) => <span className="text-[13px] text-muted">{r.phone || "—"}</span> },
    { key: "bookings", header: "Bookings", align: "right", render: (r) => <span className="tabular-nums font-semibold text-ink">{r.bookings}</span> },
    { key: "ltv", header: "Lifetime value", align: "right", render: (r) => <span className="font-display tabular-nums font-bold text-indigo-brand">{formatZar(r.paidCents)}</span> },
    { key: "wallet", header: "Wallet", align: "right", render: (r) => <span className={`tabular-nums font-semibold ${r.walletCents > 0 ? "text-money" : "text-muted-faint"}`}>{formatZar(r.walletCents)}</span> },
    { key: "joined", header: "Joined", sortKey: "createdAt", align: "right", render: (r) => <span className="text-[12.5px] text-muted">{r.createdAt.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}</span> },
  ];

  return (
    <div>
      <PageHeader title="Customers" subtitle={`${total.toLocaleString()} customer${total === 1 ? "" : "s"}`} />
      <DataTable
        columns={columns} rows={rows} total={total} page={page} pageSize={pageSize}
        basePath="/admin/customers" sp={sp} sort={sort} dir={dir}
        rowKey={(r) => r.id} rowHref={(r) => `/admin/customers/${r.id}`}
        searchPlaceholder="Search name, email, phone…"
        exportHref={buildHref("/admin/customers/export", sp, { page: undefined })}
        emptyLabel={q ? `No customers match “${q}”.` : "No customers yet."}
      />
    </div>
  );
}
