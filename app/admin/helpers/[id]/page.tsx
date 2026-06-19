import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone, Briefcase, MapPin, Landmark, FileText, Star, CheckCircle2, ShieldCheck, ShieldAlert } from "lucide-react";
import type { HelperStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatZar } from "@/lib/money";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/admin/badges";

export const dynamic = "force-dynamic";

const DOC_LABELS: Record<string, string> = { ID_DOCUMENT: "ID document", SELFIE: "Selfie", POLICE_CLEARANCE: "Police clearance", REFERENCE: "Reference" };
const STATUS_STYLE: Record<HelperStatus, string> = {
  APPROVED: "bg-[#e6f6ed] text-money", PENDING: "bg-[#fdf0dc] text-orange-deep",
  IN_REVIEW: "bg-[#eef0fb] text-indigo-brand", REJECTED: "bg-[#fdeaea] text-red-500",
};

export default async function HelperProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const h = await prisma.helperProfile.findUnique({
    where: { id },
    include: {
      user: true, areas: true, documents: { orderBy: { createdAt: "asc" } }, references: { orderBy: { createdAt: "asc" } },
      bookings: { orderBy: { scheduledAt: "desc" }, take: 10, include: { service: { select: { name: true, emoji: true, tint: true } }, area: { select: { name: true } }, customer: { select: { fullName: true } } } },
    },
  });
  if (!h) notFound();

  // Gross booking value this cleaner has handled (paid, not cancelled) — across
  // ALL their jobs, not just the 10 shown below.
  const grossAgg = await prisma.booking.aggregate({ _sum: { totalCents: true }, where: { helperId: h.id, paymentStatus: "PAID", status: { not: "CANCELLED" } } });
  const grossCents = grossAgg._sum.totalCents ?? 0;
  const decidable = h.status === "PENDING" || h.status === "IN_REVIEW";
  const statusLabel = h.status === "IN_REVIEW" ? "In review" : h.status[0] + h.status.slice(1).toLowerCase();

  return (
    <div>
      <Link href="/admin/helpers" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted transition hover:text-indigo-brand"><ArrowLeft size={15} /> All helpers</Link>

      <PageHeader
        title={h.user.fullName}
        subtitle={`Joined ${h.createdAt.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}`}
        actions={<span className={`rounded-full px-3 py-1.5 text-[12px] font-bold ${STATUS_STYLE[h.status]}`}>{statusLabel}</span>}
      />

      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <Kpi icon={<Star size={16} strokeWidth={2.2} />} label="Rating" value={h.rating > 0 ? h.rating.toFixed(1) : "—"} c="#F2960E" />
        <Kpi icon={<CheckCircle2 size={16} strokeWidth={2.2} />} label="Completed jobs" value={String(h.completedJobs)} c="#1F9D63" />
        <Kpi icon={<Briefcase size={16} strokeWidth={2.2} />} label="Revenue handled" value={formatZar(grossCents)} c="#4A2C7C" />
        <Kpi icon={<MapPin size={16} strokeWidth={2.2} />} label="Areas" value={String(h.areas.length)} c="#A22D8F" />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <Card title="Profile">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Info icon={<Mail size={14} />} label="Email" value={h.user.email} />
              <Info icon={<Phone size={14} />} label="Phone" value={h.user.phone ?? "—"} />
              <Info icon={<Briefcase size={14} />} label="Experience" value={`${h.yearsExperience} years`} />
              <Info icon={<Landmark size={14} />} label="Banking" value={h.user.bankAccountEnc ? "On file (encrypted)" : "Not provided"} />
              <Info icon={<MapPin size={14} />} label="Serves" value={h.areas.map((a) => a.name).join(", ") || "No areas selected"} />
            </div>
          </Card>

          <Card title={`Recent jobs (${h.bookings.length})`}>
            {h.bookings.length === 0 ? <p className="py-4 text-center text-[13px] text-muted">No jobs assigned yet.</p> : (
              <div className="flex flex-col">
                {h.bookings.map((b) => (
                  <Link key={b.id} href={`/admin/bookings/${b.reference}`} className="flex items-center gap-3 border-b border-[#f3eff8] py-2.5 last:border-0 transition hover:bg-[#fbf9fd]">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[10px] text-[16px]" style={{ background: b.service.tint }}>{b.service.emoji}</div>
                    <div className="min-w-0 flex-1"><div className="truncate text-[13.5px] font-semibold text-ink">{b.customer.fullName} · {b.service.name}</div><div className="text-[11.5px] text-muted-faint">{new Date(b.scheduledAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })} · {b.area.name}</div></div>
                    <StatusBadge status={b.status} />
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card title="Background check">
            <div className={`flex items-center gap-2 rounded-[12px] px-3.5 py-3 text-[13px] font-bold ${h.backgroundCheckPassed ? "bg-[#e6f6ed] text-money" : "bg-[#fdf3e7] text-orange-deep"}`}>
              {h.backgroundCheckPassed ? <ShieldCheck size={17} /> : <ShieldAlert size={17} />}
              {h.backgroundCheckPassed ? "Passed" : "Pending"}
            </div>
          </Card>

          <Card title={`References (${h.references.length})`}>
            {h.references.length === 0 ? <p className="text-[13px] text-muted">No references on file.</p> : (
              <div className="flex flex-col gap-2">
                {h.references.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 rounded-[11px] bg-[#faf8fc] px-3 py-2">
                    <div className="min-w-0"><div className="truncate text-[13px] font-semibold text-ink">{r.name}</div>{r.relationship && <div className="truncate text-[11px] text-muted-faint">{r.relationship}</div>}</div>
                    <a href={`tel:${r.phone.replace(/\s+/g, "")}`} className="flex-shrink-0 text-[12.5px] font-bold text-magenta-brand">{r.phone}</a>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Documents">
            {h.documents.length === 0 ? <p className="text-[13px] text-muted">No documents on file. Helpers added manually skip the upload step.</p> : (
              <div className="flex flex-col gap-2">
                {h.documents.map((d) => (
                  <a key={d.id} href={`/api/helper-docs/${d.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-[11px] border border-line-input bg-white px-3.5 py-2.5 text-[13px] font-semibold text-indigo-brand transition hover:bg-surface-lav"><FileText size={15} /> {DOC_LABELS[d.type] ?? "Document"}</a>
                ))}
              </div>
            )}
          </Card>

          {decidable && (
            <Card title="Vetting">
              <p className="mb-2.5 text-[13px] text-muted">This applicant is awaiting a decision.</p>
              <Link href={`/admin/vetting/${h.id}`} className="block rounded-[11px] bg-brand-gradient px-4 py-2.5 text-center text-[13.5px] font-bold text-white">Review &amp; decide</Link>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, c }: { icon: React.ReactNode; label: string; value: string; c: string }) {
  return (
    <div className="relative overflow-hidden rounded-[16px] border border-line bg-white p-4 shadow-[0_1px_2px_rgba(60,33,104,.04),0_8px_24px_-16px_rgba(60,33,104,.18)]">
      <div className="flex items-center justify-between"><span className="text-[11px] font-bold uppercase tracking-[.07em] text-muted-label">{label}</span><span style={{ color: c }} className="opacity-80">{icon}</span></div>
      <div className="mt-2 font-display text-[22px] font-extrabold tabular-nums tracking-tight text-ink">{value}</div>
      <span className="absolute inset-x-0 bottom-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${c}, transparent 85%)` }} />
    </div>
  );
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[18px] border border-line bg-white p-5 shadow-[0_1px_2px_rgba(60,33,104,.04),0_10px_30px_-22px_rgba(60,33,104,.2)]">
      <div className="mb-3 font-display text-[15px] font-bold text-ink">{title}</div>
      {children}
    </div>
  );
}
function Info({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-label">{icon}{label}</div>
      <div className="mt-0.5 text-[13.5px] font-medium text-ink">{value}</div>
    </div>
  );
}
