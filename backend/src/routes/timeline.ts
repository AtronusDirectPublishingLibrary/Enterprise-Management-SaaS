import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { calculateCriticalPath } from "../lib/criticalPath";

const router = Router();
router.use(requireAuth);

router.get("/:projectId", async (req, res, next) => {
  try {
    const data = await calculateCriticalPath(req.params.projectId);
    res.json(data);
  } catch (e) { next(e); }
});

export default router;