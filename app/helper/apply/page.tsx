import Link from "next/link";
import { prisma } from "@/lib/db";
import { Logo } from "@/components/ui/Logo";
import { HelperApplication } from "@/components/helper/HelperApplication";

export const dynamic = "force-dynamic";
export const metadata = { title: "Apply to become a helper · Household Maids" };

export default async function HelperApplyPage() {
  const areas = await prisma.area.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  return (
    <div className="min-h-[100dvh] bg-surface">
      <div className="flex items-center justify-between border-b border-line bg-white/70 px-5 py-3 backdrop-blur lg:hidden">
        <Link href="/helper" aria-label="Household Maids home"><Logo height={28} /></Link>
        <Link href="/login" className="text-[13px] font-bold text-magenta-brand">Sign in</Link>
      </div>
      <HelperApplication areas={areas} />
    </div>
  );
}
