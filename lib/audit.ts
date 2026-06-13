import { prisma } from "@/lib/db";

/** Records a sensitive action (money, admin, vetting) for accountability. */
export async function audit(params: {
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string;
  meta?: Record<string, unknown>;
  ip?: string | null;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: params.actorId ?? null,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      meta: params.meta as object | undefined,
      ip: params.ip ?? null,
    },
  });
}
