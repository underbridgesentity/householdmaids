import { prisma } from "@/lib/db";
import { AppShell } from "@/components/app/AppShell";
import { HelperApplication } from "@/components/helper/HelperApplication";

export const dynamic = "force-dynamic";

export default async function HelperApplyPage() {
  const areas = await prisma.area.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  return (
    <AppShell sidebar={false} tabs={false} narrow>
      <HelperApplication areas={areas} />
    </AppShell>
  );
}
