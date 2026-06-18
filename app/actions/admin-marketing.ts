"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { assertRole } from "@/lib/rbac";
import { segmentWhere, deliverCampaign, isSegment } from "@/lib/marketing";
import { audit } from "@/lib/audit";

const schema = z.object({
  segment: z.string(),
  subject: z.string().trim().min(2).max(140),
  body: z.string().trim().min(2).max(8000),
});

/**
 * Sends a newsletter to a segment, or a test to the admin only. The real send
 * requires an explicit confirm checkbox to guard against an accidental blast.
 */
export async function sendCampaignAction(formData: FormData): Promise<void> {
  const admin = await assertRole("ADMIN");
  const intent = String(formData.get("intent") ?? "send");
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || !isSegment(parsed.data.segment)) redirect("/admin/marketing?msg=invalid");
  const { subject, body, segment } = parsed.data;

  if (intent === "test") {
    if (!admin.email) redirect("/admin/marketing?msg=notest");
    await deliverCampaign(`[Test] ${subject}`, body, [{ id: admin.id, email: admin.email, fullName: admin.name ?? "there" }]);
    redirect("/admin/marketing?msg=tested");
  }

  if (!formData.get("confirm")) redirect("/admin/marketing?msg=confirm");

  const recipients = await prisma.user.findMany({ where: segmentWhere(segment), select: { id: true, email: true, fullName: true } });
  if (recipients.length === 0) redirect("/admin/marketing?msg=empty");

  const campaign = await prisma.campaign.create({ data: { subject, body, segment, status: "SENDING", recipientCount: recipients.length, createdById: admin.id } });
  const { sent, failed } = await deliverCampaign(subject, body, recipients);
  const status = failed === 0 ? "SENT" : sent === 0 ? "FAILED" : "PARTIAL";
  await prisma.campaign.update({ where: { id: campaign.id }, data: { status, sentCount: sent, failedCount: failed, sentAt: new Date() } });
  await audit({ actorId: admin.id, action: "campaign.sent", entity: "Campaign", entityId: campaign.id, meta: { segment, sent, failed } });
  redirect(`/admin/marketing?msg=sent&n=${sent}`);
}
