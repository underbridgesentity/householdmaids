import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { assertRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";

function csvCell(v: string | number): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV export of the customer directory, honouring the current ?q= search. */
export async function GET(req: NextRequest) {
  await assertRole("ADMIN");
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();

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

  const [users, paidAgg, walletAgg] = await Promise.all([
    prisma.user.findMany({ where, orderBy: { createdAt: "desc" }, select: { id: true, fullName: true, email: true, phone: true, createdAt: true, _count: { select: { bookings: true } } } }),
    prisma.booking.groupBy({ by: ["customerId"], where: { paymentStatus: "PAID", status: { not: "CANCELLED" } }, _sum: { totalCents: true } }),
    prisma.walletTransaction.groupBy({ by: ["userId"], where: { status: { in: ["EARNED", "PAID"] } }, _sum: { amountCents: true } }),
  ]);
  const paidBy = new Map(paidAgg.map((r) => [r.customerId, r._sum.totalCents ?? 0]));
  const walletBy = new Map(walletAgg.map((r) => [r.userId, r._sum.amountCents ?? 0]));

  const header = ["Name", "Email", "Phone", "Bookings", "Lifetime value (R)", "Wallet balance (R)", "Joined"];
  const lines = [header.map(csvCell).join(",")];
  for (const u of users) {
    lines.push([
      u.fullName, u.email, u.phone ?? "",
      u._count.bookings,
      ((paidBy.get(u.id) ?? 0) / 100).toFixed(2),
      ((walletBy.get(u.id) ?? 0) / 100).toFixed(2),
      u.createdAt.toISOString().slice(0, 10),
    ].map(csvCell).join(","));
  }

  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="customers-${today}.csv"`,
    },
  });
}
