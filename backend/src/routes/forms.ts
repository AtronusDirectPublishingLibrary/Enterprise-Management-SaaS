import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const router = Router();

// PUBLIC ROUTE (No requireAuth)
router.post("/submit", async (req, res, next) => {
  try {
    const d = z.object({
      title: z.string().min(2),
      description: z.string(),
      sourceOfFunds: z.string(),
      requesterName: z.string(),
      requesterEmail: z.string().email(),
    }).parse(req.body);

    // Generate new ID
    const rows = await prisma.project.findMany({ select: { projectId: true } });
    const max = rows.reduce((m, r) => {
      const n = parseInt(r.projectId.replace(/^P-/, ""), 10);
      return isNaN(n) ? m : Math.max(m, n);
    }, 0);
    const newId = `P-${String(max + 1).padStart(4, "0")}`;

    // Create the project (defaulting dates and admin)
    await prisma.project.create({
      data: {
        projectId: newId,
        title: d.title,
        description: `[Requested by ${d.requesterName} - ${d.requesterEmail}]\n\n${d.description}`,
        sourceOfFunds: d.sourceOfFunds,
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        status: "Not Started",
        priority: "Medium",
        createdBy: "system",
      },
    });

    res.json({ success: true, message: "Request submitted successfully", projectId: newId });
  } catch (e) { next(e); }
});

export default router;