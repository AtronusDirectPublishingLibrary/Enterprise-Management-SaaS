import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import multer from "multer";
import { parse } from "csv-parse/sync";
import bcrypt from "bcryptjs";

const router = Router();
const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage() });

// ============ STAFF ============

router.get("/staff", async (req, res) => {
  try {
    const staff = await prisma.user.findMany({
      select: {
        id: true, firstName: true, lastName: true, username: true, email: true,
        role: true, department: true, subDepartment: true, immediateSupervisorId: true,
        position: true, jobTitle: true, employeeNo: true, phone: true, hireDate: true,
        contractEnd: true, employmentType: true, avatarUrl: true,
        lastLogin: true, createdDate: true,
      },
      orderBy: { createdDate: "desc" },
    });
    res.json(staff);
  } catch (err) { res.status(500).json({ error: "Failed to fetch staff" }); }
});

router.post("/staff", async (req, res) => {
  try {
    const { firstName, lastName, username, email, role, department, subDepartment, password, immediateSupervisorId, position, jobTitle, employeeNo, phone, employmentType, contractEnd, hireDate } = req.body;
    if (!username) return res.status(400).json({ error: "Username is required" });
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) return res.status(400).json({ error: "Username already exists" });

    const passwordHash = await bcrypt.hash(password || "Password123!", 12);
    const user = await prisma.user.create({
      data: {
        firstName, lastName, username, email: email || null,
        passwordHash, role: role || "viewer",
        department: department || null, subDepartment: subDepartment || null,
        immediateSupervisorId: immediateSupervisorId || null,
        position: position || null, jobTitle: jobTitle || position || null,
        employeeNo: employeeNo || null, phone: phone || null,
        employmentType: employmentType || "Regular",
        contractEnd: employmentType === "Regular" ? null : (contractEnd ? new Date(contractEnd) : null),
        hireDate: hireDate ? new Date(hireDate) : null,
      },
    });
    res.json(user);
  } catch (err) { res.status(500).json({ error: "Failed to create staff" }); }
});

router.put("/staff/:id", async (req, res) => {
  try {
    const { firstName, lastName, username, email, role, department, subDepartment, immediateSupervisorId, position, jobTitle, employeeNo, phone, employmentType, contractEnd, hireDate } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        firstName, lastName, username, email: email || null, role,
        department: department || null, subDepartment: subDepartment || null,
        immediateSupervisorId: immediateSupervisorId || null,
        ...(position !== undefined ? { position: position || null } : {}),
        ...(jobTitle !== undefined ? { jobTitle: jobTitle || null } : {}),
        ...(employeeNo !== undefined ? { employeeNo: employeeNo || null } : {}),
        ...(phone !== undefined ? { phone: phone || null } : {}),
        ...(employmentType !== undefined ? {
          employmentType: employmentType || null,
          contractEnd: employmentType === "Regular" ? null : (contractEnd ? new Date(contractEnd) : null),
        } : {}),
        ...(hireDate !== undefined ? { hireDate: hireDate ? new Date(hireDate) : null } : {}),
      },
    });
    res.json(user);
  } catch (err) { res.status(500).json({ error: "Failed to update staff" }); }
});

router.delete("/staff/:id", async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: "Failed to delete staff" }); }
});

// ============ CSV ============

router.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  try {
    const records = parse(req.file.buffer, { columns: true, skip_empty_lines: true }) as any[];
    let added = 0, skipped = 0;
    for (const row of records) {
      const username = row.username || (row.email ? row.email.split("@")[0] : null);
      if (!username) continue;
      const exists = await prisma.user.findUnique({ where: { username } });
      if (exists) { skipped++; continue; }
      const passwordHash = await bcrypt.hash(row.password || "Password123!", 12);
      await prisma.user.create({
        data: {
          firstName: row.firstName || "", lastName: row.lastName || "",
          username, email: row.email || null, passwordHash,
          role: row.role || "viewer", department: row.department || null,
          subDepartment: row.subDepartment || null,
          position: row.position || null, jobTitle: row.position || null,
          employeeNo: row.employeeNo || null, phone: row.phone || null,
          employmentType: row.employmentType || "Regular",
          hireDate: row.hireDate ? new Date(row.hireDate) : null,
          contractEnd: row.employmentType && row.employmentType !== "Regular" && row.contractEnd ? new Date(row.contractEnd) : null,
        },
      });
      added++;
    }
    res.json({ success: true, added, skipped });
  } catch (err: any) { res.status(500).json({ error: "Failed to parse CSV", details: err.message }); }
});

router.get("/template", (req, res) => {
  const csv = "firstName,lastName,username,email,role,position,department,subDepartment,employeeNo,phone\nAhmed,Kebede,ahmed.k,ahmed@ebpe.gov.et,project_manager,Engineer,Operations,Manufacturing,EBPE-014,+251911000001\nSara,Tesfaye,sara.t,sara@ebpe.gov.et,viewer,QA and regulatory Affairs Officer,QA,Quality Control,EBPE-015,+251911000002";
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=staff_template.csv');
  res.send(csv);
});

// ============ TRAINING ============

router.get("/training", async (req, res) => {
  try {
    const data = await prisma.training.findMany({
      include: { user: { select: { firstName: true, lastName: true } } },
      orderBy: { completedAt: "desc" },
    });
    res.json(data);
  } catch (err) { res.status(500).json({ error: "Failed to fetch training" }); }
});

router.post("/training", async (req, res) => {
  try {
    const { userId, title, provider, completedAt, expiresAt } = req.body;
    const data = await prisma.training.create({
      data: {
        userId, title, provider,
        completedAt: new Date(completedAt),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });
    res.json(data);
  } catch (err) { res.status(500).json({ error: "Failed to create training" }); }
});

// ============ LEAVE ============

router.get("/leave", async (req: any, res) => {
  try {
    const data = await prisma.leaveRequest.findMany({
      include: {
        user: { select: { firstName: true, lastName: true } },
        supervisor: { select: { firstName: true, lastName: true } },
        approvedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(data);
  } catch (err) { res.status(500).json({ error: "Failed to fetch leave" }); }
});

router.post("/leave", async (req: any, res) => {
  try {
    const { type, startDate, endDate, reason } = req.body;
    const loggedInUserId = req.user?.sub;
    let supervisorId = null;

    if (loggedInUserId) {
      const user = await prisma.user.findUnique({
        where: { id: loggedInUserId },
        select: { immediateSupervisorId: true },
      });
      supervisorId = user?.immediateSupervisorId || null;
    }

    const data = await prisma.leaveRequest.create({
      data: {
        userId: loggedInUserId || req.body.userId,
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason,
        supervisorId,
      },
    });
    res.json(data);
  } catch (err) { res.status(500).json({ error: "Failed to create leave" }); }
});

// PUT /leave/:id - Approve or Reject with auto-deduction
router.put("/leave/:id", async (req: any, res) => {
  try {
    const { status, rejectionReason, signedName } = req.body;
    const isAdmin = ['admin', 'executive'].includes(req.user?.role);

    const leave = await prisma.leaveRequest.findUnique({ where: { id: req.params.id } });
    if (!leave) return res.status(404).json({ error: "Not found" });

    if (!isAdmin && leave.supervisorId !== req.user?.sub) {
      return res.status(403).json({ error: "Only the assigned supervisor or admin can approve" });
    }

    // If approving, check balance and deduct days
    if (status === "APPROVED" && leave.status !== "APPROVED") {
      const days = Math.ceil((new Date(leave.endDate).getTime() - new Date(leave.startDate).getTime()) / (1000 * 3600 * 24)) + 1;
      const year = new Date(leave.startDate).getFullYear();

      const balance = await prisma.leaveBalance.findUnique({
        where: { userId_year_leaveType: { userId: leave.userId, year, leaveType: leave.type } }
      });

      if (balance) {
        const remaining = (balance.entitledDays + balance.rolloverDays) - balance.usedDays;
        if (days > remaining) {
          return res.status(400).json({ error: `Insufficient balance. Requested: ${days} days, Available: ${remaining} days` });
        }
        await prisma.leaveBalance.update({
          where: { id: balance.id },
          data: { usedDays: balance.usedDays + days }
        });
      }
    }

    const data = await prisma.leaveRequest.update({
      where: { id: req.params.id },
      data: { status, rejectionReason, approvedById: req.user?.sub },
    });
    if (typeof signedName === "string" && signedName.trim().length >= 3) {
      const signer = await prisma.user.findUnique({
        where: { id: req.user!.sub },
        select: { signatureUrl: true, initialsUrl: true, initialsText: true },
      });
      await prisma.signatureRecord.create({
        data: {
          userId: req.user!.sub,
          entityType: "LEAVE_REQUEST",
          entityId: data.id,
          decision: status,
          signedName: signedName.trim(),
          signatureUrl: signer?.signatureUrl || null,
          initialsUrl: signer?.initialsUrl || null,
          initialsText: signer?.initialsText || null,
          note: rejectionReason || null,
        },
      });
    }
    res.json(data);
  } catch (err) { res.status(500).json({ error: "Failed to update leave" }); }
});

export default router;