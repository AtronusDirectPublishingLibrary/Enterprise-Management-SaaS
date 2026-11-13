import { Router } from "express";
import QRCode from "qrcode";

const router = Router();

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="8" fill="#0B2545"/>
  <rect x="6.5" y="6.5" width="51" height="51" rx="6" fill="none" stroke="#C9A227" stroke-width="1.5"/>
  <text x="32" y="41" font-family="Georgia, 'Times New Roman', serif" font-size="23" letter-spacing="1" fill="#C9A227" text-anchor="middle">EB</text>
</svg>`;

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * A branded, print-ready QR code. The centre logo is safe because the QR uses
 * error-correction level H (up to 30% recovery); the mark sits inside a white
 * quiet card so scanners get a clean contrast target. The destination is
 * server-controlled, never taken from the request Host header.
 */
router.get("/", async (req, res, next) => {
  try {
    const target = (process.env.PUBLIC_SITE_URL || process.env.APP_ORIGIN || "http://localhost:5173/").replace(/\/+$/, "") + "/";
    const qr = QRCode.create(target, { errorCorrectionLevel: "H" });
    const modules = qr.modules;
    const quiet = 4;
    const unit = 10;
    const size = modules.size;
    const qrSize = (size + quiet * 2) * unit;
    const labelHeight = 78;
    const width = qrSize;
    const height = qrSize + labelHeight;
    const dark = "#0B2545";
    const gold = "#C9A227";
    const paths: string[] = [];
    for (let row = 0; row < size; row += 1) {
      for (let column = 0; column < size; column += 1) {
        if (!modules.get(row, column)) continue;
        const x = (column + quiet) * unit;
        const y = (row + quiet) * unit;
        paths.push(`M${x} ${y}h${unit}v${unit}h-${unit}z`);
      }
    }
    const logoSide = Math.round(qrSize * 0.21);
    const logoX = Math.round((qrSize - logoSide) / 2);
    const logoY = Math.round((qrSize - logoSide) / 2);
    const logoData = Buffer.from(LOGO_SVG).toString("base64");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="QR code to the Ethio-Biopharma homepage">
  <rect width="${width}" height="${height}" fill="#FFFFFF"/>
  <g fill="${dark}" shape-rendering="crispEdges"><path d="${paths.join("")}"/></g>
  <rect x="${logoX - 10}" y="${logoY - 10}" width="${logoSide + 20}" height="${logoSide + 20}" rx="18" fill="#FFFFFF" stroke="${gold}" stroke-width="3"/>
  <image x="${logoX}" y="${logoY}" width="${logoSide}" height="${logoSide}" href="data:image/svg+xml;base64,${logoData}"/>
  <line x1="28" y1="${qrSize + 17}" x2="${width - 28}" y2="${qrSize + 17}" stroke="${gold}" stroke-width="2"/>
  <text x="${width / 2}" y="${qrSize + 45}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" letter-spacing="2" fill="${dark}">SCAN TO VISIT EBPE</text>
  <text x="${width / 2}" y="${qrSize + 65}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="12" fill="#5F6B7A">Ethio-Biopharma Enterprise · ${escapeXml(target.replace(/^https?:\/\//, ""))}</text>
</svg>`;
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    const asDownload = req.query.download === "1";
    res.setHeader("Content-Disposition", `${asDownload ? "attachment" : "inline"}; filename="EBPE-homepage-qr.svg"`);
    res.send(svg);
  } catch (error) {
    next(error);
  }
});

export default router;
