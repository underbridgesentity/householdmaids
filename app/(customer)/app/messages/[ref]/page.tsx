import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { AppShell } from "@/components/app/AppShell";
import { ChatThread } from "@/components/app/ChatThread";

export const dynamic = "force-dynamic";

export default async function ChatPage({ params }: { params: Promise<{ ref: string }> }) {
  const user = await requireRole("CUSTOMER");
  const { ref } = await params;
  const booking = await prisma.booking.findUnique({
    where: { reference: ref },
    include: { helper: { include: { user: true } }, conversation: { include: { messages: { orderBy: { createdAt: "asc" } } } } },
  });
  if (!booking || booking.customerId !== user.id) notFound();

  const messages = (booking.conversation?.messages ?? []).map((m) => ({
    id: m.id,
    body: m.body,
    mine: m.senderId === user.id,
    time: new Date(m.createdAt).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" }),
  }));

  return (
    <AppShell tabs={false} narrow>
      <ChatThread
        bookingId={booking.id}
        otherName={booking.helper?.user.fullName ?? "Your cleaner"}
        online
        messages={messages}
        backHref={`/app/bookings/${booking.reference}`}
      />
    </AppShell>
  );
}
