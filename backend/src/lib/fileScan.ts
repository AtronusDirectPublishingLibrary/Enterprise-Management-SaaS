import fs from "fs";
import net from "net";
import path from "path";
import { Readable } from "stream";
import type { RequestHandler } from "express";
import { logAudit } from "./audit";

const CLAMAV_HOST = process.env.CLAMAV_HOST;
const CLAMAV_PORT = Number(process.env.CLAMAV_PORT) || 3310;
const SCAN_REQUIRED = process.env.UPLOAD_SCAN_REQUIRED === "true";
const SCAN_TIMEOUT_MS = Math.max(5_000, Number(process.env.CLAMAV_TIMEOUT_MS) || 60_000);

type UploadedFile = {
  path?: string;
  buffer?: Buffer;
  originalname: string;
};

function magicMatches(file: UploadedFile): boolean {
  const ext = path.extname(file.originalname).toLowerCase();
  let bytes: Buffer<ArrayBufferLike> = Buffer.alloc(0);
  if (file.buffer) bytes = file.buffer.subarray(0, 32);
  else if (file.path && fs.existsSync(file.path)) {
    // Read only the header; uploaded videos can be hundreds of megabytes.
    const header = Buffer.alloc(32);
    const fd = fs.openSync(file.path, "r");
    try {
      const read = fs.readSync(fd, header, 0, header.length, 0);
      bytes = header.subarray(0, read);
    } finally {
      fs.closeSync(fd);
    }
  }
  if (!bytes.length) return true;

  const starts = (hex: string) => bytes.subarray(0, hex.length / 2).toString("hex") === hex;
  if (ext === ".pdf") return bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  if ([".docx", ".xlsx", ".pptx"].includes(ext)) return starts("504b0304");
  if ([".doc", ".xls", ".ppt"].includes(ext)) return starts("d0cf11e0a1b11ae1");
  if ([".jpg", ".jpeg"].includes(ext)) return starts("ffd8ff");
  if (ext === ".png") return starts("89504e47");
  if (ext === ".gif") return bytes.subarray(0, 4).toString("ascii") === "GIF8";
  if (ext === ".webp") return bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  return true;
}

function scanWithClamav(file: UploadedFile): Promise<{ clean: boolean; detail: string }> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: CLAMAV_HOST!, port: CLAMAV_PORT });
    let response = "";
    let settled = false;
    const finish = (clean: boolean, detail: string) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({ clean, detail });
    };
    const timer = setTimeout(() => finish(false, "ClamAV scan timed out"), SCAN_TIMEOUT_MS);
    timer.unref();
    socket.setTimeout(SCAN_TIMEOUT_MS, () => finish(false, "ClamAV scan timed out"));
    socket.on("error", (error) => finish(false, `ClamAV unavailable: ${error.message}`));
    socket.on("data", (chunk) => {
      response += chunk.toString();
      if (response.includes("FOUND") || response.trim().endsWith("OK")) {
        clearTimeout(timer);
        finish(!response.includes("FOUND"), response.trim());
      }
    });
    socket.on("connect", () => {
      socket.write("zINSTREAM\0");
      const source = file.buffer ? Readable.from([file.buffer]) : fs.createReadStream(file.path!);
      source.on("data", (chunk: Buffer) => {
        const length = Buffer.alloc(4);
        length.writeUInt32BE(chunk.length, 0);
        socket.write(length);
        socket.write(chunk);
      });
      source.on("error", (error: Error) => finish(false, `Could not read upload: ${error.message}`));
      source.on("end", () => socket.write(Buffer.from([0, 0, 0, 0])));
    });
  });
}

export async function scanUpload(file: UploadedFile) {
  if (!magicMatches(file)) {
    return { clean: false, scanned: false, detail: "File signature does not match its extension" };
  }
  if (!CLAMAV_HOST) {
    return {
      clean: !SCAN_REQUIRED,
      scanned: false,
      detail: SCAN_REQUIRED ? "Malware scanning is required but CLAMAV_HOST is not configured" : "Malware scanning is not configured",
    };
  }
  const result = await scanWithClamav(file);
  return { ...result, scanned: true };
}

/** Express middleware for routes that already ran Multer. */
export async function scanUploadedFile(req: any, res: any, next: any) {
  try {
    const files: UploadedFile[] = [];
    if (req.file) files.push(req.file);
    if (Array.isArray(req.files)) files.push(...req.files);
    else if (req.files && typeof req.files === "object") {
      for (const group of Object.values(req.files)) files.push(...(group as UploadedFile[]));
    }
    for (const file of files) {
      const result = await scanUpload(file);
      if (result.clean) continue;
      if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      console.error(`[upload-scan] rejected ${file.originalname}: ${result.detail}`);
      void logAudit("SECURITY", "UPLOAD_REJECTED", req.user?.username || "anonymous", {
        file: file.originalname,
        detail: result.detail,
        ip: req.ip,
      }).catch((error) => console.error("[upload-scan] could not append audit event", error));
      return res.status(400).json({ error: "The uploaded file failed security screening. Contact IT if this is unexpected." });
    }
    next();
  } catch (error) {
    console.error("[upload-scan] screening failed", error);
    return res.status(400).json({ error: "The uploaded file could not be screened." });
  }
}

/** Compose Multer and the scanner while preserving Express handler typing. */
export function withFileScan(handler: RequestHandler): RequestHandler {
  return [handler, scanUploadedFile] as unknown as RequestHandler;
}
