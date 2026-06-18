import Link from "next/link";
import { ChevronRight, ShieldCheck, ShieldAlert } from "lucide-react";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/PageHeader";
import { approveHelperAction, rejectHelperAction } from "@/app/actions/admin";

export const dynamic = "force-dynamic";

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

export default async function VettingPage() {
  const [pending, recentApproved] = await Promise.all([
    prisma.helperProfile.findMany({ where: { status: { in: ["PENDING", "IN_REVIEW"] } }, include: { user: true, areas: true, documents: true }, orderBy: { createdAt: "asc" } }),
    prisma.helperProfile.findMany({ where: { status: "APPROVED" }, include: { user: true }, orderBy: { createdAt: "desc" }, take: 8 }),
  ]);

  return (
    <div>
      <PageHeader title="Helper vetting" subtitle={`${pending.length} applicant${pending.length === 1 ? "" : "s"} awaiting review`} />

      {pending.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-line-input bg-white/60 p-12 text-center text-[14px] text-muted">No applicants awaiting review. 🎉</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pending.map((p) => (
            <div key={p.id} className="flex flex-col gap-3 rounded-[16px] border border-line bg-white p-4 shadow-[0_1px_2px_rgba(60,33,104,.04),0_10px_30px_-22px_rgba(60,33,104,.2)]">
              <Link href={`/admin/vetting/${p.id}`} className="group flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-gradient text-[15px] font-bold text-white">{initials(p.user.fullName)}</div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-extrabold text-ink group-hover:text-magenta-brand">{p.user.fullName}</div>
                  <div className="truncate text-[12.5px] text-muted">{p.areas.map((a) => a.name).join(", ") || "No areas"} · {p.yearsExperience} yrs</div>
                </div>
                <ChevronRight size={18} className="text-muted-faint" />
              </Link>

              <div className="flex flex-wrap items-center gap-2 text-[11.5px]">
                <Tag on={p.idUploaded}>ID</Tag>
                <Tag on={p.selfieUploaded}>Selfie</Tag>
                <Tag on={p.referencesAdded}>References</Tag>
                <Tag on={p.clearanceConsent}>Clearance consent</Tag>
                <span className="ml-auto inline-flex items-center gap-1 font-bold" style={{ color: p.backgroundCheckPassed ? "#1F9D63" : "#C9740A" }}>
                  {p.backgroundCheckPassed ? <ShieldCheck size={13} /> : <ShieldAlert size={13} />}
                  {p.backgroundCheckPassed ? "Check passed" : "Check pending"}
                </span>
              </div>

              <div className="mt-1 flex items-center gap-2 border-t border-line pt-3">
                <form action={rejectHelperAction.bind(null, p.id)} className="flex-1"><button type="submit" className="w-full rounded-xl border border-line-input bg-white py-2 text-[13px] font-semibold text-indigo-brand transition hover:bg-surface-pink">Reject</button></form>
                <form action={approveHelperAction.bind(null, p.id)} className="flex-1"><button type="submit" className="w-full rounded-xl bg-brand-gradient py-2 text-[13px] font-bold text-white">Approve</button></form>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-[16px] border border-line bg-white shadow-[0_1px_2px_rgba(60,33,104,.04),0_10px_30px_-22px_rgba(60,33,104,.2)]">
        <div className="border-b border-line bg-[#faf8fc] px-5 py-3 text-[13.5px] font-extrabold text-ink">Recently approved</div>
        {recentApproved.length === 0 ? <div className="px-5 py-6 text-center text-[14px] text-muted">None yet.</div> : (
          <div className="divide-y divide-line">
            {recentApproved.map((p) => (
              <Link key={p.id} href={`/admin/vetting/${p.id}`} className="flex items-center gap-3 px-5 py-3 transition hover:bg-[#fbf9fd]">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-lav text-[12px] font-bold text-indigo-brand">{initials(p.user.fullName)}</div>
                <div className="flex-1 text-[14px] font-semibold text-ink">{p.user.fullName}</div>
                <div className="text-[12.5px] font-semibold text-money">Approved ✓</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Tag({ on, children }: { on: boolean; children: React.ReactNode }) {
  return <span className={`rounded-full px-2 py-0.5 font-bold ${on ? "bg-[#e6f6ed] text-money" : "bg-[#f3eef2] text-muted-soft"}`}>{on ? "✓ " : "○ "}{children}</span>;
}
