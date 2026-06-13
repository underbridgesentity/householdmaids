import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { AppShell, ScreenHeader } from "@/components/app/AppShell";

export const dynamic = "force-dynamic";

export default async function MessagesListPage() {
  const user = await requireRole("CUSTOMER");
  const bookings = await prisma.booking.findMany({
    where: { customerId: user.id, helperId: { not: null } },
    orderBy: { scheduledAt: "desc" },
    include: { helper: { include: { user: true } }, service: true, conversation: { include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } } } },
  });

  return (
    <AppShell>
      <ScreenHeader title="Messages" subtitle="Chat with your cleaners" />
      <div className="px-[18px] pb-6">
        {bookings.length === 0 && <div className="card p-5 text-center text-[13px] text-muted">No conversations yet. Once a cleaner is assigned you can chat here.</div>}
        <div className="flex flex-col gap-2.5">
          {bookings.map((b) => {
            const last = b.conversation?.messages[0];
            return (
              <Link key={b.id} href={`/app/messages/${b.reference}`} className="flex items-center gap-3 rounded-[15px] border border-line bg-white p-3.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#cdbce4] to-[#e6d4ef] font-display font-bold text-indigo-brand">{b.helper!.user.fullName[0]}</div>
                <div className="flex-1 overflow-hidden">
                  <div className="font-display text-[14.5px] font-bold">{b.helper!.user.fullName}</div>
                  <div className="truncate text-[12.5px] text-muted">{last ? last.body : `${b.service.name} · ${b.reference}`}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
