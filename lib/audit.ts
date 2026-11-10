import type { Prisma, PrismaClient } from "@prisma/client";

type Db = Prisma.TransactionClient | PrismaClient;

export async function audit(
  db: Db,
  data: {
    actorId?: string | null;
    action: string;
    entity: string;
    entityId?: string | null;
    detail?: string | null;
  },
) {
  await db.auditLog.create({
    data: {
      actorId: data.actorId ?? null,
      action: data.action,
      entity: data.entity,
      entityId: data.entityId ?? null,
      detail: data.detail ?? null,
    },
  });
}
