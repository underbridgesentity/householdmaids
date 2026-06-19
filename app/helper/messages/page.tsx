import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { AppShell } from "@/components/app/AppShell";
import { SupportChat, type ChatMsg } from "@/components/app/SupportChat";
import { getOrCreateThread, markThreadRead } from "@/lib/support";
import { sendSupportMessageAction } from "@/app/actions/support";

export const dynamic = "force-dynamic";

export default async function HelperMessagesPage() {
  const user = await requireRole("HELPER");
  const threadId = await getOrCreateThread(user.id);
  await markThreadRead(threadId, "user");
  const messages = await prisma.supportMessage.findMany({ where: { threadId }, orderBy: { createdAt: "asc" } });

  const mapped: ChatMsg[] = messages.map((m) => ({
    id: m.id,
    body: m.body,
    mine: !m.fromAdmin,
    senderLabel: m.fromAdmin ? "Household Maids" : undefined,
    time: new Date(m.createdAt).toLocaleString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
  }));

  return (
    <AppShell variant="helper" tabs={false} narrow>
      <SupportChat
        title="Household Maids"
        subtitle="Message the team about a job, timing or access."
        avatar="HM"
        messages={mapped}
        action={sendSupportMessageAction}
        backHref="/helper/dashboard"
        placeholder="Message the team…"
        emptyHint="Running late, can't reach a customer, or need a hand? Message the Household Maids team here."
      />
    </AppShell>
  );
}
