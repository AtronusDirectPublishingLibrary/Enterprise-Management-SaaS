import QRCode from "qrcode";
import { prisma } from "./prisma";
import { getPublicSiteSettings } from "./siteSettings";
import { sendMail, mailConfigured } from "./mailer";

/**
 * Ethio-Biopharma branded gate pass.
 *
 * Generates a printable HTML gate pass matching the corporate identity
 * (navy #0B2545, gold #C9A227) with a QR code that a gate officer can scan
 * to verify the pass online. The QR encodes the public verify URL, so no
 * sensitive data is embedded in the code itself.
 */

export type GatePassInput = {
  requestId: string;
  requestCode: string;
  gatePassNo: string;
  requesterName: string;
  requesterDepartment?: string | null;
  driverName: string;
  vehicleCode: string;
  licensePlate: string;
  passengers: number;
  destination: string;
  departureDate: Date;
  departureTime: string;
  returnDate: Date;
  returnTime?: string | null;
  approverName: string;
  odometerStart?: number | null;
  odometerEnd?: number | null;
  verifyUrl: string;
};

const fmtShort = (d: Date) =>
  d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)
  );

export async function generateGatePassHtml(input: GatePassInput): Promise<string> {
  const settings = await getPublicSiteSettings();
  const logoUrl = settings.brand.logoUrl || "";
  const orgName = "Ethio-Biopharma";

  // Absolute logo URL fallback - the header shows the wordmark if no logo is uploaded.
  const logo = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(orgName)}" style="height:34px;background:#fff;padding:3px;border-radius:6px;" />`
    : `<div style="font-size:16px;font-weight:700;color:#fff;letter-spacing:1px;">${escapeHtml(orgName)}</div>`;

  const qrDataUrl = await QRCode.toDataURL(input.verifyUrl, {
    margin: 1,
    width: 200,
    color: { dark: "#0B2545", light: "#FFFFFF" },
  });

  const odometerBlock =
    input.odometerStart != null || input.odometerEnd != null
      ? `
        <div class="item"><div class="lbl">Odometer Start</div><div class="val">${
          input.odometerStart != null ? input.odometerStart.toLocaleString() + " km" : "—"
        }</div></div>
        <div class="item"><div class="lbl">Odometer End</div><div class="val">${
          input.odometerEnd != null ? input.odometerEnd.toLocaleString() + " km" : "—"
        }</div></div>`
      : "";

  const department = input.requesterDepartment
    ? `<div class="item full"><div class="lbl">Department</div><div class="val">${escapeHtml(
        input.requesterDepartment
      )}</div></div>`
    : "";

  const returnTime = input.returnTime ? " " + escapeHtml(input.returnTime) : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Gate Pass ${escapeHtml(input.gatePassNo)}</title>
<style>
  body { margin: 0; padding: 20px; background: #f5f6fa;
         font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; }
  .pass { max-width: 480px; margin: 0 auto; background: #fff; border-radius: 14px;
          box-shadow: 0 8px 30px rgba(11, 37, 69, 0.12); overflow: hidden; }
  .head { background: linear-gradient(135deg, #0B2545 0%, #0F3460 100%);
          padding: 16px 18px; text-align: center; position: relative; }
  .head::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0;
                 height: 4px; background: #C9A227; }
  .head-row { display: flex; align-items: center; justify-content: center; gap: 10px; }
  .head-sub { color: #C9A227; font-size: 10px; letter-spacing: 2px;
              text-transform: uppercase; margin-top: 6px; }
  .valid { display: inline-block; background: #10B981; color: #fff;
           padding: 2px 14px; border-radius: 12px; font-size: 10px;
           font-weight: 700; margin-top: 8px; letter-spacing: 1px; }
  .body { padding: 16px 18px; }
  .pass-no { text-align: center; font-size: 11px; color: #6B7280;
             padding-bottom: 10px; margin-bottom: 10px; border-bottom: 1px dashed #E5E7EB; }
  .pass-no strong { color: #0B2545; font-size: 13px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 14px; }
  .item { padding: 6px 0; border-bottom: 1px solid #F3F4F6; }
  .item.full { grid-column: 1 / -1; }
  .lbl { font-size: 9px; color: #9CA3AF; text-transform: uppercase;
         font-weight: 700; letter-spacing: 0.5px; }
  .val { font-size: 13px; color: #111827; font-weight: 500; margin-top: 2px; }
  .qr-section { margin-top: 16px; padding-top: 14px; border-top: 1px dashed #E5E7EB;
                display: flex; align-items: center; gap: 14px; }
  .qr-section img { border: 2px solid #0B2545; border-radius: 8px; padding: 4px; }
  .qr-text { flex: 1; font-size: 11px; color: #6B7280; line-height: 1.5; }
  .qr-text strong { color: #0B2545; }
  .security { margin-top: 14px; padding: 10px 12px; background: #F9FAFB;
              border-left: 3px solid #C9A227; border-radius: 6px; }
  .security h4 { margin: 0 0 6px; font-size: 10px; color: #0B2545;
                 text-transform: uppercase; letter-spacing: 1px; }
  .checks { display: flex; flex-wrap: wrap; gap: 6px; }
  .checks span { background: #fff; border: 1px solid #E5E7EB; border-radius: 4px;
                 padding: 3px 8px; font-size: 10px; color: #374151; }
  .foot { background: linear-gradient(90deg, #0B2545 0%, #C9A227 100%);
          padding: 12px 16px; text-align: center; color: #fff; }
  .foot .fname { font-size: 11px; font-weight: 700; letter-spacing: 1px; }
  .foot .ftag { font-size: 9px; opacity: 0.85; margin-top: 2px; }
</style>
</head>
<body>
  <div class="pass">
    <div class="head">
      <div class="head-row">${logo}</div>
      <div class="head-sub">Vehicle Gate Pass</div>
      <div class="valid">✅ VALID</div>
    </div>
    <div class="body">
      <div class="pass-no">📌 <strong>${escapeHtml(input.gatePassNo)}</strong> &nbsp;•&nbsp; 📅 ${fmtShort(
    new Date()
  )}</div>
      <div class="grid">
        <div class="item"><div class="lbl">👤 Driver</div><div class="val">${escapeHtml(
          input.driverName
        )}</div></div>
        <div class="item"><div class="lbl">🚗 Vehicle</div><div class="val">${escapeHtml(
          input.vehicleCode
        )}</div></div>
        <div class="item"><div class="lbl">🔢 Plate</div><div class="val">${escapeHtml(
          input.licensePlate
        )}</div></div>
        <div class="item"><div class="lbl">👥 Passengers</div><div class="val">${input.passengers}</div></div>
        <div class="item"><div class="lbl">🙋 Requester</div><div class="val">${escapeHtml(
          input.requesterName
        )}</div></div>
        ${department}
        <div class="item full"><div class="lbl">📍 Destination</div><div class="val">${escapeHtml(
          input.destination
        )}</div></div>
        <div class="item"><div class="lbl">📅 Departure</div><div class="val">${fmtShort(
          input.departureDate
        )} ${escapeHtml(input.departureTime)}</div></div>
        <div class="item"><div class="lbl">📅 Return</div><div class="val">${fmtShort(
          input.returnDate
        )}${returnTime}</div></div>
        ${odometerBlock}
        <div class="item full"><div class="lbl">✅ Approved By</div><div class="val">${escapeHtml(
          input.approverName
        )}</div></div>
      </div>
      <div class="qr-section">
        <img src="${qrDataUrl}" alt="Verify QR" />
        <div class="qr-text">
          <strong>Scan to verify</strong><br />
          Open this pass online at the address encoded in the QR code, or visit<br />
          <span style="word-break:break-all;">${escapeHtml(input.verifyUrl)}</span>
        </div>
      </div>
      <div class="security">
        <h4>🔒 Security Check</h4>
        <div class="checks">
          <span>⬜ Driver ID</span>
          <span>⬜ Plate No.</span>
          <span>⬜ Passengers</span>
          <span>⬜ Departure Date</span>
          <span>⬜ QR Verify</span>
        </div>
      </div>
    </div>
    <div class="foot">
      <div class="fname">🟦🟨 ${escapeHtml(orgName)} 🟨🟦</div>
      <div class="ftag">Enterprise Management System &mdash; Fleet &amp; Transport</div>
    </div>
  </div>
</body>
</html>`;
}

export type GatePassSendResult = {
  sent: boolean;
  status: "SENT" | "SKIPPED" | "FAILED";
  error?: string;
};

export async function sendGatePassEmail(args: {
  to: string[];
  subject: string;
  input: GatePassInput;
}): Promise<GatePassSendResult> {
  if (!mailConfigured()) {
    return { sent: false, status: "SKIPPED" };
  }
  try {
    const html = await generateGatePassHtml(args.input);
    const result = await sendMail({ to: args.to, subject: args.subject, html });
    return { sent: result.status === "SENT", status: result.status, error: result.error };
  } catch (err) {
    return { sent: false, status: "FAILED", error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Build the verify URL for a given request id. Falls back to a relative path
 * when PUBLIC_APP_URL is unset (e.g. during local dev).
 */
export function buildVerifyUrl(requestId: string): string {
  const base = (process.env.PUBLIC_APP_URL || process.env.CORS_ORIGIN || "http://localhost:5173")
    .split(",")[0]
    .trim()
    .replace(/\/$/, "");
  return `${base}/fleet/gate-pass/${requestId}/verify`;
}