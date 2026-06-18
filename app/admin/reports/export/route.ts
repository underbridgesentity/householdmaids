import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";

function csvCell(v: string | number): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Daily revenue report (card vs wallet split + bookings) over the window. */
export async function GET(req: NextRequest) {
  await assertRole("ADMIN");
  const w = req.nextUrl.searchParams.get("window");
  const windowDays = w === "90" ? 90 : w === "7" ? 7 : 30;

  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const windowStart = new Date(startOfToday.getTime() - (windowDays - 1) * 86400000);

  const paid = await prisma.booking.findMany({
    where: { paymentStatus: "PAID", status: { not: "CANCELLED" }, createdAt: { gte: windowStart } },
    select: { createdAt: true, totalCents: true, payment: { select: { providerRef: true } } },
  });

  // Bucket by calendar day.
  const days = new Map<string, { bookings: number; total: number; card: number; wallet: number }>();
  for (let i = 0; i < windowDays; i++) {
    const d = new Date(windowStart.getTime() + i * 86400000).toISOString().slice(0, 10);
    days.set(d, { bookings: 0, total: 0, card: 0, wallet: 0 });
  }
  for (const b of paid) {
    const d = b.createdAt.toISOString().slice(0, 10);
    const row = days.get(d);
    if (!row) continue;
    const isWallet = b.payment?.providerRef?.startsWith("WALLET-") ?? false;
    row.bookings += 1; row.total += b.totalCents;
    if (isWallet) row.wallet += b.totalCents; else row.card += b.totalCents;
  }

  const header = ["Date", "Paid bookings", "Revenue (R)", "Card (R)", "Wallet (R)"];
  const lines = [header.map(csvCell).join(",")];
  for (const [d, r] of days) {
    lines.push([d, r.bookings, (r.total / 100).toFixed(2), (r.card / 100).toFixed(2), (r.wallet / 100).toFixed(2)].map(csvCell).join(","));
  }

  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(lines.join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="revenue-${windowDays}d-${today}.csv"` },
  });
}
