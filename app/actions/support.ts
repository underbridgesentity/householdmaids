"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { assertRole } from "@/lib/rbac";
import { postMessage } from "@/lib/support";
import { notifyUser } from "@/lib/notify";
import { audit } from "@/lib/audit";

const bodySchema = z.object({ body: z.string().trim().min(1).max(4000) });

/** Customer or helper sends a message to Household Maids support. */
export async function sendSupportMessageAction(formData: FormData): Promise<void> {
  const user = await assertRole("CUSTOMER", "HELPER");
  const parsed = bodySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await postMessage({ userId: user.id, senderId: user.id, fromAdmin: false, body: parsed.data.body });
  revalidatePath("/app/messages");
  revalidatePath("/helper/messages");
}

/** Admin replies to a user's support thread. */
export async function adminReplyAction(formData: FormData): Promise<void> {
  const admin = await assertRole("ADMIN");
  const threadId = String(formData.get("threadId") ?? "");
  const parsed = bodySchema.safeParse(Object.fromEntries(formData));
  if (!threadId || !parsed.success) redirect("/admin/support");

  const thread = await prisma.supportThread.findUnique({ where: { id: threadId }, select: { userId: true } });
  if (!thread) redirect("/admin/support");

  await postMessage({ userId: thread.userId, senderId: admin.id, fromAdmin: true, body: parsed.data.body });
  await notifyUser(thread.userId, "Reply from Household Maids", parsed.data.body.slice(0, 140));
  await audit({ actorId: admin.id, action: "support.replied", entity: "SupportThread", entityId: threadId });
  revalidatePath(`/admin/support/${threadId}`);
  revalidatePath("/admin/support");
  redirect(`/admin/support/${threadId}`);
}
