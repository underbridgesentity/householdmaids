"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { assertRole } from "@/lib/rbac";
import { serviceUpsertSchema, settingsSchema } from "@/lib/validation";
import { randsToCents, formatZar } from "@/lib/money";
import { storeEncryptedFile, validUpload } from "@/lib/storage";
import { createHelperAccount } from "@/lib/helper-admin";
import { sendPayoutPaidEmail } from "@/lib/email";
import { logCustomerEmail } from "@/lib/notify";
import { audit } from "@/lib/audit";

// ---- Manually load helpers (admin) ----------------------------------------

export type AddHelperState = { error?: string; created?: { email: string; tempPassword: string } } | undefined;

const addHelperSchema = z.object({
  fullName: z.string().min(2).max(80),
  email: z.string().email().max(120),
  phone: z.string().max(20).optional().or(z.literal("")),
  yearsExperience: z.coerce.number().int().min(0).max(60).default(0),
  approved: z.coerce.boolean().default(true),
});

export async function addHelperAction(_prev: AddHelperState, formData: FormData): Promise<AddHelperState> {
  const admin = await assertRole("ADMIN");
  const parsed = addHelperSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Please check the helper's details." };
  const areaIds = formData.getAll("areaIds").map(String).filter(Boolean);
  try {
    const res = await createHelperAccount({ ...parsed.data, areaIds });
    await audit({ actorId: admin.id, action: "helper.created.manual", entity: "HelperProfile", meta: { email: res.email } });
    return { created: res };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not create helper." };
  }
}

export type ImportHelpersState =
  | { error?: string; results?: { email: string; tempPassword?: string; error?: string }[] }
  | undefined;

/** Bulk import from pasted CSV: fullName,email,phone,yearsExperience,areas(;-separated) */
export async function importHelpersAction(_prev: ImportHelpersState, formData: FormData): Promise<ImportHelpersState> {
  const admin = await assertRole("ADMIN");
  const csv = String(formData.get("csv") ?? "").trim();
  if (!csv) return { error: "Paste at least one CSV row." };

  const areas = await prisma.area.findMany();
  const areaByName = new Map(areas.map((a) => [a.name.toLowerCase(), a.id]));

  let rows = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (rows.length && /full\s*name|email/i.test(rows[0])) rows = rows.slice(1); // drop header

  const results: { email: string; tempPassword?: string; error?: string }[] = [];
  for (const line of rows.slice(0, 300)) {
    const [fullName, email, phone, exp, areasStr] = line.split(",").map((s) => s?.trim() ?? "");
    if (!fullName || !email) {
      results.push({ email: email || line, error: "missing name or email" });
      continue;
    }
    const areaIds = (areasStr ?? "")
      .split(/[;|]/)
      .map((s) => areaByName.get(s.trim().toLowerCase()))
      .filter((x): x is string => !!x);
    try {
      const r = await createHelperAccount({ fullName, email, phone, yearsExperience: Number(exp) || 0, areaIds, approved: true });
      results.push({ email: r.email, tempPassword: r.tempPassword });
    } catch (e) {
      results.push({ email, error: e instanceof Error ? e.message : "failed" });
    }
  }
  await audit({ actorId: admin.id, action: "helper.imported.bulk", entity: "HelperProfile", meta: { count: results.filter((r) => r.tempPassword).length } });
  return { results };
}

/**
 * Admin console mutations. Every action gates on ADMIN (defence in depth),
 * validates input through shared Zod schemas, and records an audit entry.
 */

export async function updateSettingsAction(formData: FormData): Promise<void> {
  const admin = await assertRole("ADMIN");
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Please check the reward values.");
  const s = parsed.data;

  await prisma.platformSettings.update({
    where: { id: "singleton" },
    data: {
      referrerRewardCents: randsToCents(s.referrerRewardRands),
      firstBookingDiscountCents: randsToCents(s.firstBookingDiscountRands),
      weeklyDiscountPct: s.weeklyDiscountPct,
      biweeklyDiscountPct: s.biweeklyDiscountPct,
      perBedroomCents: randsToCents(s.perBedroomRands),
      perBathroomCents: randsToCents(s.perBathroomRands),
    },
  });

  await audit({ actorId: admin.id, action: "settings.updated", entity: "PlatformSettings", entityId: "singleton", meta: { ...s } });
  redirect("/admin/rewards");
}

export async function upsertServiceAction(formData: FormData): Promise<void> {
  const admin = await assertRole("ADMIN");
  const parsed = serviceUpsertSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Please check the service details.");
  const input = parsed.data;

  if (input.id) {
    await prisma.service.update({
      where: { id: input.id },
      data: {
        name: input.name,
        description: input.description,
        emoji: input.emoji,
        mode: input.mode,
        basePrice: randsToCents(input.basePriceRands),
        hourlyRate: randsToCents(input.hourlyRateRands),
        minHours: input.minHours,
        quoteOnly: input.quoteOnly,
        active: input.active,
      },
    });
    await audit({ actorId: admin.id, action: "service.updated", entity: "Service", entityId: input.id });
  } else {
    const max = await prisma.service.aggregate({ _max: { sortOrder: true } });
    const created = await prisma.service.create({
      data: {
        name: input.name,
        description: input.description,
        emoji: input.emoji || "🧽",
        tint: "#eef0fb",
        mode: input.mode,
        basePrice: randsToCents(input.basePriceRands),
        hourlyRate: randsToCents(input.hourlyRateRands),
        minHours: input.minHours,
        quoteOnly: input.quoteOnly,
        active: input.active,
        sortOrder: (max._max.sortOrder ?? 0) + 1,
      },
    });
    await audit({ actorId: admin.id, action: "service.created", entity: "Service", entityId: created.id });
  }

  redirect("/admin/services");
}

export async function toggleServiceActiveAction(id: string): Promise<void> {
  const admin = await assertRole("ADMIN");
  const service = await prisma.service.findUnique({ where: { id } });
  if (!service) throw new Error("Service not found");
  await prisma.service.update({ where: { id }, data: { active: !service.active } });
  await audit({ actorId: admin.id, action: "service.toggled", entity: "Service", entityId: id, meta: { active: !service.active } });
  redirect("/admin/services");
}

export async function deleteServiceAction(id: string): Promise<void> {
  const admin = await assertRole("ADMIN");
  // A service referenced by bookings or enquiries can't be hard-deleted (FK), so
  // deactivate it instead. Check dependents explicitly rather than swallowing
  // every error as "has bookings" (which would hide real DB failures).
  const [bookings, enquiries] = await Promise.all([
    prisma.booking.count({ where: { serviceId: id } }),
    prisma.enquiry.count({ where: { serviceId: id } }),
  ]);
  if (bookings > 0 || enquiries > 0) {
    await prisma.service.update({ where: { id }, data: { active: false } });
    await audit({ actorId: admin.id, action: "service.deactivated", entity: "Service", entityId: id, meta: { reason: "has-dependents", bookings, enquiries } });
  } else {
    await prisma.service.delete({ where: { id } });
    await audit({ actorId: admin.id, action: "service.deleted", entity: "Service", entityId: id });
  }
  redirect("/admin/services");
}

export async function approveHelperAction(profileId: string): Promise<void> {
  const admin = await assertRole("ADMIN");
  // Only approve a helper still under review. Guards against a stale/duplicate
  // submit flipping a REJECTED helper back to APPROVED.
  // NOTE: the background-check flag is now tracked SEPARATELY (setBackgroundCheckAction)
  // and is no longer auto-stamped on approval — approval and the background
  // check are independent decisions an admin records explicitly.
  const res = await prisma.helperProfile.updateMany({
    where: { id: profileId, status: { in: ["PENDING", "IN_REVIEW"] } },
    data: { status: "APPROVED" },
  });
  if (res.count > 0) {
    await audit({ actorId: admin.id, action: "helper.approved", entity: "HelperProfile", entityId: profileId });
  }
  redirect("/admin/vetting");
}

/** Records the background-check outcome independently of approval status. */
export async function setBackgroundCheckAction(formData: FormData): Promise<void> {
  const admin = await assertRole("ADMIN");
  const profileId = String(formData.get("profileId") ?? "");
  const passed = String(formData.get("passed") ?? "") === "true";
  if (!profileId) redirect("/admin/vetting");
  await prisma.helperProfile.update({ where: { id: profileId }, data: { backgroundCheckPassed: passed } });
  await audit({ actorId: admin.id, action: "helper.backgroundCheck", entity: "HelperProfile", entityId: profileId, meta: { passed } });
  redirect(`/admin/vetting/${profileId}`);
}

export async function rejectHelperAction(profileId: string): Promise<void> {
  const admin = await assertRole("ADMIN");
  // Reject only from a non-rejected state (allows revoking an approved helper).
  const res = await prisma.helperProfile.updateMany({
    where: { id: profileId, status: { in: ["PENDING", "IN_REVIEW", "APPROVED"] } },
    data: { status: "REJECTED" },
  });
  if (res.count > 0) {
    await audit({ actorId: admin.id, action: "helper.rejected", entity: "HelperProfile", entityId: profileId });
  }
  redirect("/admin/vetting");
}

/**
 * Step 1 of the weekly payout: CLAIM every REQUESTED payout into a new batch
 * (PayoutCycle) and move them to PROCESSING. This does NOT mark anything paid —
 * the admin downloads the batch CSV, makes the transfers in their own bank, then
 * confirms with confirmPayoutBatchAction. Scoping the claim to REQUESTED makes a
 * concurrent/double export safe (the second claim grabs 0 rows).
 */
export async function exportPayoutBatchAction(): Promise<void> {
  const admin = await assertRole("ADMIN");
  const label = new Date().toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" });
  const { cycleId, claimed } = await prisma.$transaction(async (tx) => {
    const cycle = await tx.payoutCycle.create({ data: { label, runAt: new Date() } });
    const res = await tx.payoutRequest.updateMany({ where: { status: "REQUESTED" }, data: { status: "PROCESSING", cycleId: cycle.id } });
    return { cycleId: cycle.id, claimed: res.count };
  });
  if (claimed === 0) {
    await prisma.payoutCycle.delete({ where: { id: cycleId } }); // don't litter history with empty batches
    redirect("/admin/payouts?msg=empty");
  }
  await audit({ actorId: admin.id, action: "payout.batchExported", entity: "PayoutCycle", entityId: cycleId, meta: { count: claimed } });
  redirect(`/admin/payouts?exported=${cycleId}`);
}

/**
 * Step 2: the admin confirms they've actually made the transfers for a batch.
 * Marks every PROCESSING row in the cycle PAID, stamps the cycle paid, attaches
 * an optional proof-of-payment (visible to each affiliate), and emails everyone.
 */
export async function confirmPayoutBatchAction(formData: FormData): Promise<void> {
  const admin = await assertRole("ADMIN");
  const cycleId = String(formData.get("cycleId") ?? "");
  if (!cycleId) redirect("/admin/payouts");

  const proof = validUpload(formData.get("proof"));
  if (proof === "invalid") redirect("/admin/payouts?msg=badproof");
  let proofKey: string | undefined;
  if (proof) {
    const bytes = Buffer.from(await proof.arrayBuffer());
    proofKey = (await storeEncryptedFile(`payout-proof/${cycleId}`, proof.name, bytes)).storageKey;
  }

  const requests = await prisma.payoutRequest.findMany({ where: { cycleId, status: "PROCESSING" }, include: { user: { select: { email: true, fullName: true } } } });
  if (requests.length === 0) redirect("/admin/payouts?msg=nothing");

  await prisma.$transaction(async (tx) => {
    await tx.payoutRequest.updateMany({ where: { cycleId, status: "PROCESSING" }, data: { status: "PAID", paidAt: new Date() } });
    await tx.payoutCycle.update({ where: { id: cycleId }, data: { paidAt: new Date(), ...(proofKey ? { proofKey } : {}) } });
  });

  for (const req of requests) {
    try {
      await sendPayoutPaidEmail({ to: req.user.email, fullName: req.user.fullName, reference: req.reference, amountCents: req.amountCents });
      await logCustomerEmail(req.userId, `Payout sent · ${formatZar(req.amountCents)}`, `Your payout of ${formatZar(req.amountCents)} (${req.reference}) was processed.`, "payout");
    } catch { /* best-effort */ }
  }
  const total = requests.reduce((t, r) => t + r.amountCents, 0);
  await audit({ actorId: admin.id, action: "payout.batchConfirmed", entity: "PayoutCycle", entityId: cycleId, meta: { totalCents: total, count: requests.length, hasProof: !!proofKey } });
  redirect("/admin/payouts?msg=confirmed");
}

export async function approvePayoutAction(id: string): Promise<void> {
  const admin = await assertRole("ADMIN");
  // Only pay out a requested row — guards a double-approve and prevents paying a
  // held row without releasing it first.
  const res = await prisma.payoutRequest.updateMany({ where: { id, status: "REQUESTED" }, data: { status: "PAID", paidAt: new Date() } });
  if (res.count > 0) {
    const req = await prisma.payoutRequest.findUnique({ where: { id }, include: { user: { select: { email: true, fullName: true } } } });
    if (req) {
      try {
        await sendPayoutPaidEmail({ to: req.user.email, fullName: req.user.fullName, reference: req.reference, amountCents: req.amountCents });
        await logCustomerEmail(req.userId, `Payout sent · ${formatZar(req.amountCents)}`, `Your payout of ${formatZar(req.amountCents)} (${req.reference}) was processed.`, "payout");
      } catch { /* best-effort */ }
    }
  }
  await audit({ actorId: admin.id, action: "payout.approved", entity: "PayoutRequest", entityId: id });
  redirect("/admin/payouts");
}

export async function holdPayoutAction(id: string): Promise<void> {
  const admin = await assertRole("ADMIN");
  // Only a still-requested payout can be put on hold (not one already paid).
  await prisma.payoutRequest.updateMany({ where: { id, status: "REQUESTED" }, data: { status: "HELD" } });
  await audit({ actorId: admin.id, action: "payout.held", entity: "PayoutRequest", entityId: id });
  redirect("/admin/payouts");
}

/** Releases a held payout back into the requested queue so it can be paid. */
export async function releasePayoutAction(id: string): Promise<void> {
  const admin = await assertRole("ADMIN");
  await prisma.payoutRequest.updateMany({ where: { id, status: "HELD" }, data: { status: "REQUESTED" } });
  await audit({ actorId: admin.id, action: "payout.released", entity: "PayoutRequest", entityId: id });
  redirect("/admin/payouts");
}
