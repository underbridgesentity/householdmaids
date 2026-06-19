import Link from "next/link";
import { ChevronRight, MessageCircle } from "lucide-react";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/PageHeader";

export const dynamic = "force-dynamic";

export default async function AdminSupportPage() {
  const threads = await prisma.supportThread.findMany({
    where: { lastMessageAt: { not: null } },
    orderBy: { lastMessageAt: "desc" },
    take: 60,
    include: {
      user: { select: { id: true, fullName: true, role: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const ids = threads.map((t) => t.id);
  const userMsgs = ids.length
    ? await prisma.supportMessage.findMany({ where: { threadId: { in: ids }, fromAdmin: false }, select: { threadId: true, createdAt: true } })
    : [];
  const unreadBy = new Map<string, number>();
  for (const t of threads) {
    unreadBy.set(t.id, userMsgs.filter((m) => m.threadId === t.id && (!t.adminReadAt || m.createdAt > t.adminReadAt)).length);
  }
  const totalUnread = [...unreadBy.values()].reduce((a, b) => a + b, 0);

  return (
    <div>
      <PageHeader title="Support" subtitle={totalUnread > 0 ? `${totalUnread} unread message${totalUnread === 1 ? "" : "s"}` : "Customer & cleaner conversations"} />

      <div className="overflow-hidden rounded-[16px] border border-line bg-white shadow-[0_1px_2px_rgba(60,33,104,.04),0_10px_30px_-22px_rgba(60,33,104,.2)]">
        {threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-lav text-magenta-brand"><MessageCircle size={22} /></div>
            <div className="mt-3 font-display text-[15px] font-bold text-ink">No conversations yet</div>
            <p className="mt-1 text-[13px] text-muted">Messages from customers and cleaners will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {threads.map((t) => {
              const last = t.messages[0];
              const unread = unreadBy.get(t.id) ?? 0;
              return (
                <Link key={t.id} href={`/admin/support/${t.id}`} className="group flex items-center gap-3 px-5 py-3.5 transition hover:bg-[#fbf9fd]">
                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-display text-[13px] font-bold text-white ${t.user.role === "HELPER" ? "bg-gradient-to-br from-indigo-brand to-purple-mid" : "bg-gradient-to-br from-magenta-brand to-orange-brand"}`}>{t.user.fullName[0]?.toUpperCase()}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold text-ink">{t.user.fullName}</span>
                      <span className="flex-shrink-0 rounded bg-surface-lav px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-indigo-brand">{t.user.role === "HELPER" ? "Cleaner" : "Customer"}</span>
                    </div>
                    <div className={`truncate text-[12.5px] ${unread > 0 ? "font-semibold text-ink" : "text-muted-faint"}`}>{last ? `${last.fromAdmin ? "You: " : ""}${last.body}` : "—"}</div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2.5">
                    <span className="text-[11.5px] text-muted-faint">{t.lastMessageAt ? t.lastMessageAt.toLocaleDateString("en-ZA", { day: "numeric", month: "short" }) : ""}</span>
                    {unread > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-magenta-brand px-1.5 text-[11px] font-bold text-white">{unread}</span>}
                    <ChevronRight size={16} className="text-muted-faint" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
