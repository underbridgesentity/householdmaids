import { prisma } from "@/lib/db";

/**
 * Support messaging: one thread per user (customer or helper) with the
 * Household Maids team. Read state is two-sided (userReadAt / adminReadAt);
 * "unread" = messages from the OTHER party after your last read.
 */

/** Returns the user's thread, creating it on first use. Upsert avoids the
 *  check-then-create race on a double-submit (unique userId would otherwise throw). */
export async function getOrCreateThread(userId: string): Promise<string> {
  const t = await prisma.supportThread.upsert({ where: { userId }, create: { userId }, update: {}, select: { id: true } });
  return t.id;
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

/** Count of unread (customer/helper-sent) messages awaiting an admin reply, for
 *  the nav badge. A single indexed SQL count — runs on every admin page load, so
 *  it must not load rows. */
export async function adminUnreadCount(): Promise<number> {
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    SELECT COUNT(*)::int AS count
    FROM "SupportMessage" m
    JOIN "SupportThread" t ON m."threadId" = t.id
    WHERE m."fromAdmin" = false
      AND (t."adminReadAt" IS NULL OR m."createdAt" > t."adminReadAt")`;
  return Number(rows[0]?.count ?? 0);
}

/** Whether the user has unread admin replies (for the customer/helper nav dot). */
export async function userHasUnread(userId: string): Promise<boolean> {
  const t = await prisma.supportThread.findUnique({ where: { userId }, select: { userReadAt: true, messages: { where: { fromAdmin: true }, select: { createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 } } });
  if (!t || t.messages.length === 0) return false;
  return !t.userReadAt || t.messages[0].createdAt > t.userReadAt;
}
