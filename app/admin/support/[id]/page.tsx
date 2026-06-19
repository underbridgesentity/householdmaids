import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Send, Mail, Phone, CalendarRange } from "lucide-react";
import { prisma } from "@/lib/db";
import { markThreadRead } from "@/lib/support";
import { adminReplyAction } from "@/app/actions/support";

export const dynamic = "force-dynamic";

export default async function AdminSupportThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const thread = await prisma.supportThread.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, fullName: true, role: true, email: true, phone: true, _count: { select: { bookings: true } } } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!thread) notFound();
  await markThreadRead(id, "admin");

  const isHelper = thread.user.role === "HELPER";
  const profileHref = isHelper ? null : `/admin/customers/${thread.user.id}`;

  return (
    <div>
      <Link href="/admin/support" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted transition hover:text-indigo-brand"><ArrowLeft size={15} /> All conversations</Link>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Conversation */}
        <div className="lg:col-span-2">
          <div className="flex h-[68vh] min-h-[420px] flex-col overflow-hidden rounded-[18px] border border-line bg-white shadow-[0_1px_2px_rgba(60,33,104,.04),0_10px_30px_-22px_rgba(60,33,104,.2)]">
            <div className="flex items-center gap-3 border-b border-line px-5 py-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-full font-display text-[13px] font-bold text-white ${isHelper ? "bg-gradient-to-br from-indigo-brand to-purple-mid" : "bg-gradient-to-br from-magenta-brand to-orange-brand"}`}>{thread.user.fullName[0]?.toUpperCase()}</div>
              <div className="min-w-0">
                <div className="truncate font-display text-[14.5px] font-bold text-ink">{thread.user.fullName}</div>
                <div className="text-[11.5px] text-muted-faint">{isHelper ? "Cleaner" : "Customer"}</div>
              </div>
            </div>

            <div className="hm-scroll flex flex-1 flex-col gap-2.5 overflow-y-auto bg-[#faf8fc] p-5">
              {thread.messages.length === 0 && <div className="mx-auto mt-8 text-center text-[13px] text-muted">No messages yet.</div>}
              {thread.messages.map((m) => (
                <div key={m.id} className={`flex ${m.fromAdmin ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-snug shadow-sm ${m.fromAdmin ? "rounded-br-md bg-brand-gradient text-white" : "rounded-bl-md bg-white text-ink"}`}>
                    {m.body}
                    <div className={`mt-1 text-right text-[10px] ${m.fromAdmin ? "text-white/70" : "text-muted-faint"}`}>{m.createdAt.toLocaleString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                </div>
              ))}
            </div>

            <form action={adminReplyAction} className="flex items-center gap-2.5 border-t border-line bg-white px-4 py-3">
              <input type="hidden" name="threadId" value={thread.id} />
              <input name="body" required autoComplete="off" placeholder={`Reply to ${thread.user.fullName.split(" ")[0]}…`} className="flex-1 rounded-full border-[1.5px] border-line-input bg-[#faf8fc] px-4 py-2.5 text-[14px] outline-none focus:border-magenta-brand" />
              <button type="submit" aria-label="Send reply" className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-gradient text-white"><Send size={17} strokeWidth={2.2} /></button>
            </form>
          </div>
        </div>

        {/* Context */}
        <div className="flex flex-col gap-5">
          <div className="rounded-[18px] border border-line bg-white p-5 shadow-[0_1px_2px_rgba(60,33,104,.04),0_10px_30px_-22px_rgba(60,33,104,.2)]">
            <div className="mb-3 font-display text-[15px] font-bold text-ink">Contact</div>
            <div className="flex flex-col gap-2.5 text-[13px]">
              <div className="flex items-center gap-2 text-muted"><Mail size={14} /> <span className="truncate text-ink">{thread.user.email}</span></div>
              {thread.user.phone && <div className="flex items-center gap-2 text-muted"><Phone size={14} /> <span className="text-ink">{thread.user.phone}</span></div>}
              <div className="flex items-center gap-2 text-muted"><CalendarRange size={14} /> <span className="text-ink">{thread.user._count.bookings} booking{thread.user._count.bookings === 1 ? "" : "s"}</span></div>
            </div>
            {profileHref && <Link href={profileHref} className="mt-4 block rounded-[11px] border border-line-input bg-white px-4 py-2.5 text-center text-[13px] font-bold text-indigo-brand transition hover:bg-surface-lav">View customer profile</Link>}
            {isHelper && <Link href={`/admin/helpers`} className="mt-4 block rounded-[11px] border border-line-input bg-white px-4 py-2.5 text-center text-[13px] font-bold text-indigo-brand transition hover:bg-surface-lav">View in helpers</Link>}
          </div>
        </div>
      </div>
    </div>
  );
}
