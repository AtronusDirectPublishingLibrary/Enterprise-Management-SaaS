import { appendAudit } from "./auditChain";

export async function logAudit(grantId: string, action: string, user: string, details?: any) {
  try {
    await appendAudit({ grantId, action, user, details });
  } catch (e) {
    console.error("audit failed", e);
  }
}
