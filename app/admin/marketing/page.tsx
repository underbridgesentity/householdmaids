import { Send, Users } from "lucide-react";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/PageHeader";
import { SEGMENTS, segmentWhere, type SegmentKey } from "@/lib/marketing";
import { sendCampaignAction } from "@/app/actions/admin-marketing";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // batch sends to large segments can take time

const SEG_LABEL: Record<string, string> = Object.fromEntries(SEGMENTS.map((s) => [s.key, s.label]));

const MSG: Record<string, { ok: boolean; text: string }> = {
  tested: { ok: true, text: "Test email sent to your address. Check it (and your spam folder) before sending for real." },
  confirm: { ok: false, text: "Tick the confirmation box before sending a campaign to customers." },
  invalid: { ok: false, text: "Add a subject and message, and pick an audience." },
  empty: { ok: false, text: "That segment has no opted-in customers right now." },
  notest: { ok: false, text: "No admin email on file to send a test to." },
};

export default async function MarketingPage({ searchParams }: { searchParams: Promise<{ msg?: string; n?: string }> }) {
  const sp = await searchParams;

  const [counts, campaigns] = await Promise.all([
    Promise.all(SEGMENTS.map((s) => prisma.user.count({ where: segmentWhere(s.key) }))),
    prisma.campaign.findMany({ orderBy: { createdAt: "desc" }, take: 15 }),
  ]);
  const countBy = new Map(SEGMENTS.map((s, i) => [s.key as SegmentKey, counts[i]]));
  const optedOut = await prisma.user.count({ where: { role: "CUSTOMER", marketingOptOut: true } });

  const banner = sp.msg === "sent"
    ? { ok: true, text: `Campaign sent to ${sp.n ?? "your"} recipient${sp.n === "1" ? "" : "s"}.` }
    : sp.msg ? MSG[sp.msg] : null;

  return (
    <div>
      <PageHeader title="Newsletter" subtitle="Send updates and offers to a customer segment" />

      {banner && <div className={`mb-5 rounded-[12px] border px-4 py-3 text-[13.5px] font-semibold ${banner.ok ? "border-[#cfe8d8] bg-[#eef6f0] text-money" : "border-[#f3d9c4] bg-[#fdf3e7] text-orange-deep"}`}>{banner.text}</div>}

      <form action={sendCampaignAction} className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Audience */}
        <div className="lg:col-span-1">
          <div className="rounded-[18px] border border-line bg-white p-5 shadow-[0_1px_2px_rgba(60,33,104,.04),0_10px_30px_-22px_rgba(60,33,104,.2)]">
            <div className="mb-3 font-display text-[15px] font-bold text-ink">Audience</div>
            <div className="flex flex-col gap-2">
              {SEGMENTS.map((s, i) => {
                const n = countBy.get(s.key) ?? 0;
                return (
                  <label key={s.key} className="flex cursor-pointer items-start gap-2.5 rounded-[12px] border border-line-input bg-white px-3 py-2.5 transition has-[:checked]:border-magenta-brand has-[:checked]:bg-surface-pink/40">
                    <input type="radio" name="segment" value={s.key} defaultChecked={i === 0} className="mt-0.5 accent-magenta-brand" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13.5px] font-bold text-ink">{s.label}</span>
                        <span className="inline-flex items-center gap-1 text-[12px] font-bold text-indigo-brand"><Users size={12} /> {n}</span>
                      </div>
                      <div className="text-[11.5px] text-muted-faint">{s.help}</div>
                    </div>
                  </label>
                );
              })}
            </div>
            <p className="mt-3 text-[11.5px] text-muted-faint">{optedOut} customer{optedOut === 1 ? "" : "s"} opted out and are always excluded.</p>
          </div>
        </div>

        {/* Compose */}
        <div className="lg:col-span-2">
          <div className="rounded-[18px] border border-line bg-white p-5 shadow-[0_1px_2px_rgba(60,33,104,.04),0_10px_30px_-22px_rgba(60,33,104,.2)]">
            <div className="mb-3 font-display text-[15px] font-bold text-ink">Compose</div>
            <div className="flex flex-col gap-3">
              <input name="subject" required maxLength={140} placeholder="Subject line" className="h-11 rounded-[11px] border border-line-input bg-white px-3.5 text-[14px] outline-none transition focus:border-magenta-brand focus:ring-2 focus:ring-magenta-brand/15" />
              <textarea name="body" required maxLength={8000} rows={11} placeholder={"Write your message…\n\nEach customer is greeted by name, and an unsubscribe link is added automatically. Leave a blank line between paragraphs."} className="rounded-[11px] border border-line-input bg-white px-3.5 py-3 text-[14px] leading-relaxed outline-none transition focus:border-magenta-brand focus:ring-2 focus:ring-magenta-brand/15" />
              <label className="flex items-center gap-2.5 rounded-[11px] bg-[#faf8fc] px-3.5 py-3 text-[13px] font-semibold text-ink">
                <input type="checkbox" name="confirm" value="1" className="h-4 w-4 accent-money" />
                I&apos;ve reviewed this and want to send it to the selected audience.
              </label>
              <div className="flex flex-wrap items-center gap-2.5">
                <button type="submit" name="intent" value="test" className="rounded-[11px] border border-line-input bg-white px-4 py-2.5 text-[13.5px] font-bold text-indigo-brand transition hover:bg-surface-lav">Send test to me</button>
                <button type="submit" name="intent" value="send" className="inline-flex items-center gap-2 rounded-[11px] bg-brand-gradient px-4 py-2.5 text-[13.5px] font-bold text-white"><Send size={15} /> Send campaign</button>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* History */}
      <div className="mt-6 overflow-hidden rounded-[16px] border border-line bg-white shadow-[0_1px_2px_rgba(60,33,104,.04),0_10px_30px_-22px_rgba(60,33,104,.2)]">
        <div className="border-b border-line bg-[#faf8fc] px-5 py-3 text-[13.5px] font-extrabold text-ink">Past campaigns ({campaigns.length})</div>
        {campaigns.length === 0 ? (
          <div className="px-5 py-8 text-center text-[14px] text-muted">No campaigns sent yet.</div>
        ) : (
          <div className="divide-y divide-line">
            {campaigns.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-semibold text-ink">{c.subject}</div>
                  <div className="text-[12px] text-muted-faint">{SEG_LABEL[c.segment] ?? c.segment} · {(c.sentAt ?? c.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}</div>
                </div>
                <div className="text-right">
                  <div className="font-display text-[13.5px] font-bold tabular-nums text-money">{c.sentCount} sent</div>
                  {c.failedCount > 0 && <div className="text-[11px] font-bold text-orange-deep">{c.failedCount} failed</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
