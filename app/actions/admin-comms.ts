"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { assertRole } from "@/lib/rbac";
import { sendEmail } from "@/lib/email";
import { notifyUser } from "@/lib/notify";
import { audit } from "@/lib/audit";

const schema = z.object({
  customerId: z.string().min(1),
  subject: z.string().trim().min(2).max(140),
  body: z.string().trim().min(2).max(4000),
});

/** Admin sends a one-off email to a customer (also drops an in-app notice). */
export async function emailCustomerAction(formData: FormData): Promise<void> {
  const admin = await assertRole("ADMIN");
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/admin/customers/${formData.get("customerId")}?msg=invalid`);
  const { customerId, subject, body } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: customerId }, select: { email: true, fullName: true, role: true } });
  if (!user) redirect("/admin/customers?msg=notfound");

  const first = user.fullName.trim().split(" ")[0] || "there";
  const text = `Hi ${first},\n\n${body}\n\nThe Household Maids team`;

  try {
    await sendEmail({ to: user.email, subject, text });
  } catch {
    redirect(`/admin/customers/${customerId}?msg=emailfailed`);
  }
  // Mirror it in-app so the customer sees it even if email is missed.
  await notifyUser(customerId, subject, body);
  await audit({ actorId: admin.id, action: "customer.emailed", entity: "User", entityId: customerId, meta: { subject } });
  redirect(`/admin/customers/${customerId}?msg=sent`);
}
