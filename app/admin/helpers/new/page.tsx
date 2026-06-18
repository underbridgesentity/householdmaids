import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/PageHeader";
import { HelperManager } from "@/components/admin/HelperManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Add helpers · Admin" };

export default async function AddHelpersPage() {
  const areas = await prisma.area.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  return (
    <div>
      <Link href="/admin/helpers" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted transition hover:text-indigo-brand"><ArrowLeft size={15} /> All helpers</Link>
      <PageHeader title="Add helpers" subtitle="Load your existing team so they can sign in before public sign-ups open, or import them in bulk." />
      <div className="max-w-3xl">
        <HelperManager areas={areas.map((a) => ({ id: a.id, name: a.name }))} />
      </div>
    </div>
  );
}
