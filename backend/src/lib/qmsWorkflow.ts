import { prisma } from "./prisma";

export const QMS_DEPARTMENTS = [
  "QA",
  "Production",
  "QC",
  "Warehouse",
  "Engineering",
  "Regulatory",
  "HR",
  "IT",
] as const;

export const QMS_DEPARTMENT_VALUES = QMS_DEPARTMENTS;

export function qmsActor(user: any) {
  return user?.username || "system";
}

export function qmsCleanBody(body: any) {
  const out: any = {};
  for (const [key, value] of Object.entries(body || {})) {
    if (value === "") continue;
    if (value === "null" || value === "undefined") {
      out[key] = null;
      continue;
    }
    out[key] = value;
  }
  return out;
}

export function qmsCodePrefix(prefix: string, department?: string | null) {
  const dept = (department || "QA").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5) || "QA";
  return `${prefix}-${dept}-`;
}

export function qmsNextCode(prefix: string, lastCode?: string | null, digits = 3) {
  const n = lastCode ? Number.parseInt(lastCode.slice(prefix.length), 10) + 1 : 1;
  return prefix + String(Number.isFinite(n) ? n : 1).padStart(digits, "0");
}

export function qmsAddDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export async function notifyQmsUser(
  username: string | undefined | null,
  title: string,
  body: string,
  link: string
) {
  if (!username) return;
  try {
    await prisma.notification.create({
      data: { recipient: username, type: "QMS_WORKFLOW", title, body, link },
    });
  } catch (error) {
    console.error("qms notification failed", error);
  }
}

export async function notifyQmsApprovers(title: string, body: string, link: string) {
  try {
    const recipients = await prisma.user.findMany({
      where: {
        OR: [
          { position: { in: ["Chief Executive Officer", "QA and regulatory Affairs Officer"] } },
          { role: "admin" },
        ],
      },
      select: { username: true },
    });
    if (recipients.length === 0) return;
    await prisma.notification.createMany({
      data: recipients.map((recipient) => ({
        recipient: recipient.username,
        type: "QMS_WORKFLOW",
        title,
        body,
        link,
      })),
    });
  } catch (error) {
    console.error("qms approver notification failed", error);
  }
}
