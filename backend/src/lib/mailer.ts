import nodemailer, { Transporter } from "nodemailer";

export type MailStatus = "SENT" | "SKIPPED" | "FAILED";

export interface MailResult {
  status: MailStatus;
  error?: string;
}

let transporter: Transporter | null = null;

/** Outgoing mail needs an SMTP endpoint; nothing is sent (only logged) when absent. */
export function mailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.MAIL_FROM);
}

export function mailConfigHint(): string {
  return "Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and MAIL_FROM in backend/.env to deliver alert email.";
}

function getTransport(): Transporter | null {
  if (!mailConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }
  return transporter;
}

export async function sendMail(input: {
  to: string[];
  subject: string;
  html: string;
  text?: string;
}): Promise<MailResult> {
  const transport = getTransport();
  if (!transport) {
    console.info(`[mail] skipped (SMTP not configured): ${input.subject}`);
    return { status: "SKIPPED" };
  }
  try {
    await transport.sendMail({
      from: process.env.MAIL_FROM,
      to: input.to.join(", "),
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    return { status: "SENT" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[mail] failed: ${message}`);
    return { status: "FAILED", error: message };
  }
}
