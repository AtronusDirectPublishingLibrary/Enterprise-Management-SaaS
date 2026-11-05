import { prisma } from "./prisma";
import { sendNotification } from "./notify";

export async function runAutomations(projectId: string, event: string, payload: any) {
  try {
    const rules = await prisma.automationRule.findMany({
      where: { projectId, enabled: true, triggerEvent: event },
    });

    for (const rule of rules) {
      // 1. Check Trigger Value (e.g., did the status change to "Complete"?)
      if (rule.triggerValue && payload.newValue !== rule.triggerValue) {
        continue;
      }

      // 2. Execute Action
      if (rule.actionType === "NOTIFY" && rule.actionTarget) {
        await sendNotification(
          rule.actionTarget,
          "SYSTEM",
          rule.name,
          rule.actionValue || `Automation triggered for ${payload.title}`,
          `/database/pms/${projectId}`
        );
      }
      
      // You can add more action types here (e.g., ASSIGN)
    }
  } catch (e) {
    console.error("Automation engine failed:", e);
  }
}