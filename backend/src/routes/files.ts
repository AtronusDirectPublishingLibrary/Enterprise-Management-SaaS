import { Router } from "express";
import path from "path";
import fs from "fs";
import { prisma } from "../lib/prisma";
import { allows, isAdminUser, isHrAdmin } from "../lib/access";
import { logAudit } from "../lib/audit";

const router = Router();
const uploadRoot = path.resolve(process.cwd(), "uploads");

function deny(res: any, status: number, message: string) {
  return res.status(status).json({ error: message });
}

function publicDocument(doc: { isPublic: boolean; status: string; projectId: string | null }) {
  return doc.isPublic && doc.status === "Active" && !doc.projectId;
}

/** GET /api/files/<path> — the only delivery path for non-public uploads. */
router.get("/*", async (req: any, res, next) => {
  try {
    const relative = String(req.params[0] || "").replace(/^\/+/, "");
    if (!relative || relative.includes("\0") || relative.split(/[\\/]/).includes("..")) {
      return deny(res, 400, "Invalid file path");
    }
    const absolute = path.resolve(uploadRoot, relative);
    if (!absolute.startsWith(uploadRoot + path.sep)) {
      return deny(res, 400, "Invalid file path");
    }
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
      return deny(res, 404, "File not found");
    }

    const url = `/uploads/${relative}`;
    const user = req.user;

    const document = await prisma.document.findFirst({ where: { fileUrl: url } });
    if (document) {
      if (publicDocument(document)) {
        res.set("Cache-Control", "public, max-age=60");
        return res.sendFile(absolute);
      }
      if (!user) return deny(res, 401, "Not authenticated");
      const canView =
        allows(user, "archive") ||
        allows(user, "documents") ||
        user.role === "project_manager" ||
        (document.projectId ? allows(user, "pms") : false) ||
        isAdminUser(user);
      if (!canView) return deny(res, 403, "You do not have access to this document");
      res.set("Cache-Control", "private, no-store");
      logAudit("FILES", "FILE_DOWNLOAD", user.username, {
        file: relative,
        entityType: "DOCUMENT",
        entityId: document.id,
      }).catch(() => undefined);
      return res.sendFile(absolute);
    }

    const qms = await prisma.qmsDocument.findFirst({ where: { fileUrl: url } });
    if (qms) {
      if (!user) return deny(res, 401, "Not authenticated");
      const owner = qms.ownerId === user.sub || qms.approverId === user.sub || qms.reviewerId === user.sub;
      if (!owner && !allows(user, "qms") && !isAdminUser(user)) {
        return deny(res, 403, "You do not have access to this controlled document");
      }
      res.set("Cache-Control", "private, no-store");
      logAudit("FILES", "FILE_DOWNLOAD", user.username, {
        file: relative,
        entityType: "QMS_DOCUMENT",
        entityId: qms.id,
      }).catch(() => undefined);
      return res.sendFile(absolute);
    }

    const staffDocument = await prisma.staffDocument.findFirst({ where: { fileUrl: url } });
    if (staffDocument) {
      if (!user) return deny(res, 401, "Not authenticated");
      if (staffDocument.userId !== user.sub && !isHrAdmin(user) && !allows(user, "hr")) {
        return deny(res, 403, "You do not have access to this staff document");
      }
      res.set("Cache-Control", "private, no-store");
      logAudit("FILES", "FILE_DOWNLOAD", user.username, {
        file: relative,
        entityType: "STAFF_DOCUMENT",
        entityId: staffDocument.id,
      }).catch(() => undefined);
      return res.sendFile(absolute);
    }

    const applicant = await prisma.applicant.findFirst({ where: { resumeUrl: url } });
    if (applicant) {
      if (!user) return deny(res, 401, "Not authenticated");
      if (!allows(user, "recruitment") && !isAdminUser(user) && user.role !== "executive") {
        return deny(res, 403, "You do not have access to recruitment files");
      }
      res.set("Cache-Control", "private, no-store");
      logAudit("FILES", "FILE_DOWNLOAD", user.username, {
        file: relative,
        entityType: "APPLICANT",
        entityId: applicant.id,
      }).catch(() => undefined);
      return res.sendFile(absolute);
    }

    // Signature and initial images are stamped into shared signed forms; they
    // are private to the platform but not to one owner's colleagues.
    if (relative.startsWith("signatures/")) {
      if (!user) return deny(res, 401, "Not authenticated");
      res.set("Cache-Control", "private, no-store");
      return res.sendFile(absolute);
    }

    return deny(res, 404, "File not found");
  } catch (error) {
    next(error);
  }
});

export default router;
