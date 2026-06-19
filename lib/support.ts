import { prisma } from "@/lib/db";

/**
 * Support messaging: one thread per user (customer or helper) with the
 * Household Maids team. Read state is two-sided (userReadAt / adminReadAt);
 * "unread" = messages from the OTHER party after your last read.
 */

/** Returns the user's thread, creating it on first use. */
export async function getOrCreateThread(userId: string): Promise<string> {
  const existing = await prisma.supportThread.findUnique({ where: { userId }, select: { id: true } });
  if (existing) return existing.id;
  const created = await prisma.supportThread.create({ data: { userId }, select: { id: true } });
  return created.id;
}

/** Posts a message into a user's thread (creating it if needed). */
export async function postMessage(opts: { userId: string; senderId: string; fromAdmin: boolean; body: string }): Promise<void> {
  const threadId = await getOrCreateThread(opts.userId);
  await prisma.$transaction([
    prisma.supportMessage.create({ data: { threadId, senderId: opts.senderId, fromAdmin: opts.fromAdmin, body: opts.body } }),
    prisma.supportThread.update({
      where: { id: threadId },
      // Sending also marks the thread read for the sender's side.
      data: { lastMessageAt: new Date(), ...(opts.fromAdmin ? { adminReadAt: new Date() } : { userReadAt: new Date() }) },
    }),
  ]);
}

/** Marks a thread read for one side. */
export async function markThreadRead(threadId: string, side: "user" | "admin"): Promise<void> {
  await prisma.supportThread.update({
    where: { id: threadId },
    data: side === "user" ? { userReadAt: new Date() } : { adminReadAt: new Date() },
  });
}

/** Count of unread (customer/helper-sent) messages awaiting an admin reply, for the nav badge. */
export async function adminUnreadCount(): Promise<number> {
  const threads = await prisma.supportThread.findMany({ select: { adminReadAt: true, messages: { where: { fromAdmin: false }, select: { createdAt: true } } } });
  let n = 0;
  for (const t of threads) {
    n += t.messages.filter((m) => !t.adminReadAt || m.createdAt > t.adminReadAt).length;
  }
  return n;
}

/** Whether the user has unread admin replies (for the customer/helper nav dot). */
export async function userHasUnread(userId: string): Promise<boolean> {
  const t = await prisma.supportThread.findUnique({ where: { userId }, select: { userReadAt: true, messages: { where: { fromAdmin: true }, select: { createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 } } });
  if (!t || t.messages.length === 0) return false;
  return !t.userReadAt || t.messages[0].createdAt > t.userReadAt;
}
