"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/crypto";

/** Opts a customer out of marketing email from a signed unsubscribe link. */
export async function unsubscribeAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const userId = verifyToken(token);
  if (!userId) redirect("/");
  await prisma.user.update({ where: { id: userId }, data: { marketingOptOut: true } }).catch(() => {});
  redirect(`/unsubscribe/${token}?done=1`);
}
