import { prisma } from "@/lib/db";
import { EnquiryCard } from "@/components/admin/EnquiryCard";

export const dynamic = "force-dynamic";

export default async function EnquiriesPage() {
  const enquiries = await prisma.enquiry.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { service: { select: { name: true, emoji: true } }, area: { select: { name: true } } },
  });

  const newCount = enquiries.filter((e) => e.status === "NEW").length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Quote enquiries</h1>
        <p className="mt-1 text-[14px] text-muted">
          Spec-based requests from the quote form. {newCount > 0 ? `${newCount} awaiting a reply.` : "All caught up."}
        </p>
      </div>

      {enquiries.length === 0 ? (
        <div className="card p-8 text-center text-[14px] text-muted">No quote requests yet.</div>
      ) : (
        <div className="flex flex-col gap-4">
          {enquiries.map((e) => (
            <EnquiryCard
              key={e.id}
              enquiry={{
                id: e.id,
                reference: e.reference,
                serviceName: e.service.name,
                serviceEmoji: e.service.emoji,
                areaName: e.area?.name ?? null,
                name: e.name,
                email: e.email,
                phone: e.phone,
                details: e.details,
                status: e.status,
                adminNote: e.adminNote,
                createdAt: e.createdAt.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
