import { prisma } from "@/lib/db";
import { approveHelperAction, rejectHelperAction } from "@/app/actions/admin";

const DOC_LABELS: Record<string, string> = {
  ID_DOCUMENT: "📎 View ID",
  SELFIE: "🤳 View selfie",
  POLICE_CLEARANCE: "🛡️ View clearance",
  REFERENCE: "📇 View reference",
};

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function VettingPage() {
  const [pending, recentApproved] = await Promise.all([
    prisma.helperProfile.findMany({
      where: { status: { in: ["PENDING", "IN_REVIEW"] } },
      include: { user: true, areas: true, documents: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.helperProfile.findMany({
      where: { status: "APPROVED" },
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Helper vetting</h1>
        <p className="mt-1 text-[14px] text-muted">Review applicants and approve them onto the platform.</p>
      </div>

      {pending.length === 0 ? (
        <div className="card p-8 text-center text-[14px] text-muted">No applicants awaiting review. 🎉</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pending.map((p) => {
            const docs = [
              p.idUploaded ? "ID" : null,
              p.referencesAdded ? "references" : null,
              p.clearanceConsent ? "Police clearance" : null,
            ].filter(Boolean).join(" · ");
            const approve = approveHelperAction.bind(null, p.id);
            const reject = rejectHelperAction.bind(null, p.id);

            return (
              <div key={p.id} className="card flex flex-col gap-3 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-gradient text-[15px] font-bold text-white">
                    {initials(p.user.fullName)}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-extrabold text-ink">{p.user.fullName}</div>
                    <div className="truncate text-[12.5px] text-muted">
                      {p.areas.map((a) => a.name).join(", ") || "No areas"} · {p.yearsExperience} yrs experience
                    </div>
                  </div>
                </div>

                {p.documents.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {p.documents.map((d) => (
                      <a
                        key={d.id}
                        href={`/api/helper-docs/${d.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-line-input bg-white px-2.5 py-1 text-[12px] font-semibold text-indigo-brand transition hover:bg-surface-lav"
                      >
                        {DOC_LABELS[d.type] ?? "📎 View document"}
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="text-[12.5px] text-muted">{docs || "No documents on file"}</div>
                )}

                <div className={"text-[12.5px] font-semibold " + (p.backgroundCheckPassed ? "text-money" : "text-orange-brand")}>
                  {p.backgroundCheckPassed ? "Background check passed ✅" : "Awaiting checks ⏳"}
                </div>

                <div className="mt-1 flex items-center gap-2 border-t border-line pt-3">
                  <form action={reject} className="flex-1">
                    <button type="submit" className="w-full rounded-xl border border-line-input bg-white py-2 text-[13px] font-semibold text-indigo-brand transition hover:bg-surface-pink">
                      Reject
                    </button>
                  </form>
                  <form action={approve} className="flex-1">
                    <button type="submit" className="w-full rounded-xl bg-brand-gradient py-2 text-[13px] font-bold text-white">
                      Approve
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="border-b border-line px-5 py-3.5 text-[14px] font-extrabold text-ink">Recently approved</div>
        {recentApproved.length === 0 ? (
          <div className="px-5 py-6 text-center text-[14px] text-muted">None yet.</div>
        ) : (
          <div className="divide-y divide-line">
            {recentApproved.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-lav text-[12px] font-bold text-indigo-brand">
                  {initials(p.user.fullName)}
                </div>
                <div className="flex-1 text-[14px] font-semibold text-ink">{p.user.fullName}</div>
                <div className="text-[12.5px] font-semibold text-money">Approved ✅</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
