import { prisma } from "@/lib/db";
import { HelperManager } from "@/components/admin/HelperManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Helpers · Admin" };

export default async function AdminHelpersPage() {
  const [areas, total, approved] = await Promise.all([
    prisma.area.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.helperProfile.count(),
    prisma.helperProfile.count({ where: { status: "APPROVED" } }),
  ]);

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold">Helpers</h1>
      <p className="mb-6 mt-1 text-[13.5px] text-muted-soft">
        {approved} approved · {total} total. Load your existing team here so they can sign in before public sign-ups open, or
        let people apply via <span className="font-semibold text-indigo-brand">Become a helper</span> and approve them in{" "}
        <span className="font-semibold text-indigo-brand">Helper vetting</span>.
      </p>
      <div className="max-w-3xl">
        <HelperManager areas={areas.map((a) => ({ id: a.id, name: a.name }))} />
      </div>
    </div>
  );
}
