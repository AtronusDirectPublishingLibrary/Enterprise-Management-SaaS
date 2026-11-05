import { prisma } from "./prisma";

export async function logAudit(grantId: string, action: string, user: string, details?: any) {
  try {
    await prisma.auditLog.create({
      data: { grantId: grantId || "PMS", action, user: user || "system", details: details ?? {} },
    });
  } catch (e) {
    console.error("audit failed", e);
  }
}
