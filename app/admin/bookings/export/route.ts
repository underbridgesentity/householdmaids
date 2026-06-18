import { NextRequest, NextResponse } from "next/server";
import type { Prisma, BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { assertRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const STATUSES = ["CONFIRMED", "HELPER_ASSIGNED", "EN_ROUTE", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

function csvCell(v: string | number): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV export of bookings honouring the current status / paid / search filters. */
export async function GET(req: NextRequest) {
  await assertRole("ADMIN");
  const p = req.nextUrl.searchParams;
  const q = (p.get("q") ?? "").trim();
  const status = p.get("status");
  const paid = p.get("paid");

  const where: Prisma.BookingWhereInput = {
    ...(status && STATUSES.includes(status) ? { status: status as BookingStatus } : {}),
    ...(paid === "1" ? { paymentStatus: "PAID" } : paid === "0" ? { paymentStatus: "PENDING" } : {}),
    ...(q ? { OR: [
      { reference: { contains: q, mode: "insensitive" } },
      { customer: { fullName: { contains: q, mode: "insensitive" } } },
    ] } : {}),
  };

  const bookings = await prisma.booking.findMany({
    where, orderBy: { scheduledAt: "desc" },
    include: {
      service: { select: { name: true } }, area: { select: { name: true } },
      customer: { select: { fullName: true, email: true } },
      helper: { select: { user: { select: { fullName: true } } } },
    },
  });

  const header = ["Reference", "Customer", "Email", "Service", "Area", "Cleaner", "Scheduled", "Status", "Payment", "Total (R)"];
  const lines = [header.map(csvCell).join(",")];
  for (const b of bookings) {
    lines.push([
      b.reference, b.customer.fullName, b.customer.email, b.service.name, b.area.name,
      b.helper?.user.fullName ?? "", b.scheduledAt.toISOString().slice(0, 16).replace("T", " "),
      b.status, b.paymentStatus, (b.totalCents / 100).toFixed(2),
    ].map(csvCell).join(","));
  }

  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(lines.join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="bookings-${today}.csv"` },
  });
}
