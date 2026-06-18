import type { BookingStatus } from "@prisma/client";

const STATUS_STYLE: Record<BookingStatus, { label: string; cls: string }> = {
  CONFIRMED: { label: "Confirmed", cls: "bg-[#eef0fb] text-indigo-brand" },
  HELPER_ASSIGNED: { label: "Assigned", cls: "bg-surface-lav text-purple-mid" },
  EN_ROUTE: { label: "En route", cls: "bg-[#fdf0dc] text-orange-deep" },
  IN_PROGRESS: { label: "In progress", cls: "bg-[#fdeaf6] text-magenta-brand" },
  COMPLETED: { label: "Completed", cls: "bg-[#e6f6ed] text-money" },
  CANCELLED: { label: "Cancelled", cls: "bg-[#f3eef2] text-muted-soft" },
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  const s = STATUS_STYLE[status];
  return <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-bold ${s.cls}`}>{s.label}</span>;
}

const PAY_STYLE: Record<string, { label: string; cls: string }> = {
  PAID: { label: "Paid", cls: "bg-[#e6f6ed] text-money" },
  PENDING: { label: "Unpaid", cls: "bg-[#fdf0dc] text-orange-deep" },
  FAILED: { label: "Failed", cls: "bg-[#fdeaea] text-red-500" },
  REFUNDED: { label: "Refunded", cls: "bg-[#f3eef2] text-muted-soft" },
};

export function PayBadge({ status }: { status: string }) {
  const s = PAY_STYLE[status] ?? PAY_STYLE.PENDING;
  return <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-bold ${s.cls}`}>{s.label}</span>;
}
