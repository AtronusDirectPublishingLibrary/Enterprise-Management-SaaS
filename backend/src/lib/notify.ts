import { prisma } from "./prisma";

export async function sendNotification(recipient: string, type: string, title: string, body?: string, link?: string) {
  try {
    await prisma.notification.create({
      data: { recipient, type, title, body, link },
    });
  } catch (e) {
    console.error("Failed to send notification:", e);
  }
}