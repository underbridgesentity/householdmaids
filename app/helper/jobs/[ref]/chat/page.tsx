import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { AppShell } from "@/components/app/AppShell";
import { ChatThread } from "@/components/app/ChatThread";

export const dynamic = "force-dynamic";

export default async function HelperChatPage({ params }: { params: Promise<{ ref: string }> }) {
  const user = await requireRole("HELPER");
  const { ref } = await params;

  const booking = await prisma.booking.findUnique({
    where: { reference: ref },
    include: {
      customer: true,
      helper: true,
      conversation: { include: { messages: { orderBy: { createdAt: "asc" } } } },
    },
  });
  if (!booking || booking.helper?.userId !== user.id) notFound();

  const messages = (booking.conversation?.messages ?? []).map((m) => ({
    id: m.id,
    body: m.body,
    mine: m.senderId === user.id,
    time: new Date(m.createdAt).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" }),
  }));

  return (
    <AppShell variant="helper" tabs={false} narrow>
      <ChatThread
        bookingId={booking.id}
        otherName={booking.customer.fullName}
        online
        messages={messages}
        backHref={`/helper/jobs/${booking.reference}`}
      />
    </AppShell>
  );
}
