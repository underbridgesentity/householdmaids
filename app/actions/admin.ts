"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { assertRole } from "@/lib/rbac";
import { serviceUpsertSchema, settingsSchema } from "@/lib/validation";
import { randsToCents } from "@/lib/money";
import { decrypt } from "@/lib/crypto";
import { getPayoutAdapter, type PayoutInstruction } from "@/lib/payout";
import { createHelperAccount } from "@/lib/helper-admin";
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
  // submit flipping a REJECTED helper back to APPROVED (which would also
  // re-stamp backgroundCheckPassed and feed them into live job assignment).
  const res = await prisma.helperProfile.updateMany({
    where: { id: profileId, status: { in: ["PENDING", "IN_REVIEW"] } },
    data: { status: "APPROVED", backgroundCheckPassed: true },
  });
  if (res.count > 0) {
    await audit({ actorId: admin.id, action: "helper.approved", entity: "HelperProfile", entityId: profileId });
  }
  redirect("/admin/vetting");
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

export async function runFridayPayoutAction(): Promise<void> {
  const admin = await assertRole("ADMIN");

  // 1. Atomically CLAIM all REQUESTED payouts into a new cycle. Scoping the
  //    update to status REQUESTED means a concurrent/double run can't grab the
  //    same rows (the second claim returns count 0).
  const label = new Date().toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" });
  const { cycleId, claimed } = await prisma.$transaction(async (tx) => {
    const cycle = await tx.payoutCycle.create({ data: { label, runAt: new Date() } });
    const res = await tx.payoutRequest.updateMany({
      where: { status: "REQUESTED" },
      data: { status: "PROCESSING", cycleId: cycle.id },
    });
    return { cycleId: cycle.id, claimed: res.count };
  });

  if (claimed === 0) {
    redirect("/admin/payouts?ran=0"); // nothing to pay out
  }

  // 2. Build bank instructions from the rows WE claimed (decrypt full acct #).
  const requests = await prisma.payoutRequest.findMany({
    where: { cycleId, status: "PROCESSING" },
    include: { user: true },
  });
  const instructions: PayoutInstruction[] = requests.map((req) => {
    let bank = "", accountNumber = "", accountType = "";
    if (req.user.bankAccountEnc) {
      try {
        const acct = JSON.parse(decrypt(req.user.bankAccountEnc)) as { bank: string; accountNumber: string; type?: string; accountType?: string };
        bank = acct.bank; accountNumber = acct.accountNumber; accountType = acct.type ?? acct.accountType ?? "";
      } catch { /* empty details */ }
    }
    return { reference: req.reference, beneficiaryName: req.user.fullName, bank, accountNumber, accountType, amountCents: req.amountCents };
  });

  // 3. Run the external money movement OUTSIDE any DB transaction, so a DB
  //    failure can't roll back work the bank already accepted.
  const { batchRef } = await getPayoutAdapter().process(instructions);
  const total = instructions.reduce((t, i) => t + i.amountCents, 0);

  // 4. Mark the claimed rows PAID (the batch CSV is regenerated on demand from
  //    this cycle's rows by the download route, so nothing extra to persist).
  await prisma.payoutRequest.updateMany({
    where: { cycleId, status: "PROCESSING" },
    data: { status: "PAID", paidAt: new Date() },
  });

  await audit({ actorId: admin.id, action: "payout.fridayRun", entity: "PayoutCycle", entityId: cycleId, meta: { batchRef, totalCents: total, count: instructions.length } });
  redirect(`/admin/payouts?ran=1&cycle=${cycleId}`);
}

export async function approvePayoutAction(id: string): Promise<void> {
  const admin = await assertRole("ADMIN");
  await prisma.payoutRequest.update({ where: { id }, data: { status: "PAID", paidAt: new Date() } });
  await audit({ actorId: admin.id, action: "payout.approved", entity: "PayoutRequest", entityId: id });
  redirect("/admin/payouts");
}

export async function holdPayoutAction(id: string): Promise<void> {
  const admin = await assertRole("ADMIN");
  await prisma.payoutRequest.update({ where: { id }, data: { status: "HELD" } });
  await audit({ actorId: admin.id, action: "payout.held", entity: "PayoutRequest", entityId: id });
  redirect("/admin/payouts");
}
