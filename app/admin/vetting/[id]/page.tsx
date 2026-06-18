import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone, FileText, ShieldCheck, ShieldAlert, MapPin, Briefcase, Landmark } from "lucide-react";
import type { HelperStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/PageHeader";
import { approveHelperAction, rejectHelperAction, setBackgroundCheckAction } from "@/app/actions/admin";

export const dynamic = "force-dynamic";

const DOC_LABELS: Record<string, string> = {
  ID_DOCUMENT: "ID document", SELFIE: "Selfie", POLICE_CLEARANCE: "Police clearance", REFERENCE: "Reference",
};
const STATUS_STYLE: Record<HelperStatus, { label: string; cls: string }> = {
  PENDING: { label: "Pending", cls: "bg-[#fdf0dc] text-orange-deep" },
  IN_REVIEW: { label: "In review", cls: "bg-[#eef0fb] text-indigo-brand" },
  APPROVED: { label: "Approved", cls: "bg-[#e6f6ed] text-money" },
  REJECTED: { label: "Rejected", cls: "bg-[#fdeaea] text-red-500" },
};

export default async function VettingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await prisma.helperProfile.findUnique({
    where: { id },
    include: { user: true, areas: true, documents: { orderBy: { createdAt: "asc" } } },
  });
  if (!p) notFound();

  const st = STATUS_STYLE[p.status];
  const checklist = [
    { label: "ID uploaded", on: p.idUploaded },
    { label: "Selfie uploaded", on: p.selfieUploaded },
    { label: "References added", on: p.referencesAdded },
    { label: "Police-clearance consent", on: p.clearanceConsent },
  ];
  const decidable = p.status === "PENDING" || p.status === "IN_REVIEW";

  return (
    <div>
      <Link href="/admin/vetting" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted transition hover:text-indigo-brand"><ArrowLeft size={15} /> All applicants</Link>

      <PageHeader
        title={p.user.fullName}
        subtitle={`Applied ${p.createdAt.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}`}
        actions={<span className={`rounded-full px-3 py-1.5 text-[12px] font-bold ${st.cls}`}>{st.label}</span>}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left: applicant detail */}
        <div className="flex flex-col gap-5 lg:col-span-2">
          <Card title="Applicant">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Info icon={<Mail size={14} />} label="Email" value={p.user.email} />
              <Info icon={<Phone size={14} />} label="Phone" value={p.user.phone ?? "—"} />
              <Info icon={<Briefcase size={14} />} label="Experience" value={`${p.yearsExperience} years`} />
              <Info icon={<MapPin size={14} />} label="Areas served" value={p.areas.map((a) => a.name).join(", ") || "None selected"} />
              <Info icon={<Landmark size={14} />} label="Banking details" value={p.user.bankAccountEnc ? "On file (encrypted)" : "Not provided"} />
              <Info label="Completed jobs" value={`${p.completedJobs} · ⭐ ${p.rating.toFixed(1)}`} />
            </div>
          </Card>

          <Card title="Documents">
            {p.documents.length === 0 ? <p className="text-[13px] text-muted">No documents uploaded.</p> : (
              <div className="flex flex-wrap gap-2.5">
                {p.documents.map((d) => (
                  <a key={d.id} href={`/api/helper-docs/${d.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-[11px] border border-line-input bg-white px-3.5 py-2.5 text-[13px] font-semibold text-indigo-brand transition hover:bg-surface-lav">
                    <FileText size={15} /> {DOC_LABELS[d.type] ?? "Document"}{d.verified && <span className="text-money">✓</span>}
                  </a>
                ))}
              </div>
            )}
          </Card>

          <Card title="Vetting checklist">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {checklist.map((c) => (
                <div key={c.label} className="flex items-center gap-2 rounded-[11px] bg-[#faf8fc] px-3 py-2.5 text-[13px] font-semibold text-ink">
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white ${c.on ? "bg-money" : "bg-muted-faint"}`}>{c.on ? "✓" : "○"}</span>
                  {c.label}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right: decisions */}
        <div className="flex flex-col gap-5">
          <Card title="Background check">
            <div className={`mb-3 flex items-center gap-2 rounded-[12px] px-3.5 py-3 text-[13px] font-bold ${p.backgroundCheckPassed ? "bg-[#e6f6ed] text-money" : "bg-[#fdf3e7] text-orange-deep"}`}>
              {p.backgroundCheckPassed ? <ShieldCheck size={17} /> : <ShieldAlert size={17} />}
              {p.backgroundCheckPassed ? "Background check passed" : "Background check pending"}
            </div>
            <p className="mb-3 text-[12px] text-muted">Tracked independently of approval — record the outcome when the check is complete.</p>
            <form action={setBackgroundCheckAction}>
              <input type="hidden" name="profileId" value={p.id} />
              <input type="hidden" name="passed" value={p.backgroundCheckPassed ? "false" : "true"} />
              <button type="submit" className={`w-full rounded-[11px] px-4 py-2.5 text-[13.5px] font-bold transition ${p.backgroundCheckPassed ? "border border-line-input bg-white text-orange-deep hover:bg-[#fdf3e7]" : "bg-money text-white"}`}>
                {p.backgroundCheckPassed ? "Mark as not passed" : "Mark check passed"}
              </button>
            </form>
          </Card>

          <Card title="Decision">
            {decidable ? (
              <div className="flex flex-col gap-2.5">
                {!p.backgroundCheckPassed && <p className="rounded-[10px] bg-[#fdf3e7] px-3 py-2 text-[12px] font-semibold text-orange-deep">Heads up: the background check hasn&apos;t been marked passed yet.</p>}
                <form action={approveHelperAction.bind(null, p.id)}><button type="submit" className="w-full rounded-[11px] bg-brand-gradient px-4 py-2.5 text-[13.5px] font-bold text-white">Approve onto platform</button></form>
                <form action={rejectHelperAction.bind(null, p.id)}><button type="submit" className="w-full rounded-[11px] border border-line-input bg-white px-4 py-2.5 text-[13.5px] font-semibold text-indigo-brand transition hover:bg-surface-pink">Reject application</button></form>
              </div>
            ) : p.status === "APPROVED" ? (
              <div className="flex flex-col gap-2.5">
                <p className="text-[13px] text-muted">This helper is approved and can be assigned jobs.</p>
                <form action={rejectHelperAction.bind(null, p.id)}><button type="submit" className="w-full rounded-[11px] border border-[#f1c9c9] bg-white px-4 py-2.5 text-[13.5px] font-bold text-red-500 transition hover:bg-[#fdf2f2]">Revoke approval</button></form>
              </div>
            ) : (
              <p className="text-[13px] text-muted">This application was rejected.</p>
            )}
          </Card>
        </div>
      </div>
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
