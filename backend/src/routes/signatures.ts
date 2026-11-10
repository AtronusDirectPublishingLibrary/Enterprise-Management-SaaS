import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

/** The signed forms and decisions belonging to the signed-in person. */
router.get("/me", async (req, res, next) => {
  try {
    const signatures = await prisma.signatureRecord.findMany({
      where: { userId: req.user!.sub },
      orderBy: { signedAt: "desc" },
      take: 100,
    });
    res.set("Cache-Control", "no-store");
    res.json(signatures);
  } catch (error) {
    next(error);
  }
});

export default router;
