"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { assertRole } from "@/lib/rbac";
import { enquirySchema, enquiryStatusSchema } from "@/lib/validation";
import { enquiryReference } from "@/lib/reference";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";
import { audit } from "@/lib/audit";

export type EnquiryState = { error?: string; reference?: string } | undefined;

/**
 * Captures a public quote request for a spec-based service (e.g. commercial
 * window cleaning). No account or payment is required, the admin reviews the
 * enquiry and follows up with a tailored price.
 */
export async function createEnquiryAction(formData: FormData): Promise<EnquiryState> {
  const ip = await clientIp();
  if (!(await rateLimit(`enquiry:${ip}`, 10, 60 * 60 * 1000))) {
    return { error: "Too many requests. Please try again shortly." };
  }

  const parsed = enquirySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please review your details and try again." };
  }
  const input = parsed.data;

  const service = await prisma.service.findUnique({ where: { id: input.serviceId } });
  if (!service || !service.active || !service.quoteOnly) {
    return { error: "That service is not available for quotes." };
  }
  const areaId = input.areaId
    ? (await prisma.area.findUnique({ where: { id: input.areaId }, select: { id: true } }))?.id ?? null
    : null;

  const reference = enquiryReference();
  await prisma.enquiry.create({
    data: {
      reference,
      serviceId: service.id,
      areaId,
      name: input.name,
      email: input.email.toLowerCase(),
      phone: input.phone || null,
      details: input.details,
    },
  });
  await audit({ action: "enquiry.created", entity: "Enquiry", entityId: reference, meta: { serviceId: service.id } });

  // Notify the team so a quote can be prepared (best-effort; never block the user).
  try {
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { email: true } });
    const to = admins.map((a) => a.email).filter(Boolean);
    if (to.length) {
      await sendEmail({
        to: to.join(","),
        subject: `New quote request ${reference} · ${service.name}`,
        text: `A new quote request has come in.\n\nReference: ${reference}\nService: ${service.name}\nName: ${input.name}\nEmail: ${input.email}\nPhone: ${input.phone || "—"}\n\nDetails:\n${input.details}\n\nReview it in the admin enquiries inbox.`,
      });
    }
  } catch {
    /* email is best-effort; the enquiry is already saved */
  }

  revalidatePath("/admin/enquiries");
  return { reference };
}

/** Admin: move an enquiry through NEW → QUOTED → CLOSED and record a note. */
export async function updateEnquiryAction(formData: FormData): Promise<void> {
  const admin = await assertRole("ADMIN");
  const parsed = enquiryStatusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Invalid enquiry update");
  const { id, status, adminNote } = parsed.data;

  await prisma.enquiry.update({
    where: { id },
    data: { status, adminNote: adminNote || null },
  });
  await audit({ actorId: admin.id, action: "enquiry.updated", entity: "Enquiry", entityId: id, meta: { status } });
  revalidatePath("/admin/enquiries");
}
