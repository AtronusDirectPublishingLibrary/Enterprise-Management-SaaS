import { Router } from "express";
import { z } from "zod";
import { requireAccess, requireAuth } from "../middleware/auth";
import { currentPlans, plansWithCurrentFlag } from "../lib/currentPlans";
import {
  buildConsolidatedReport,
  reportToCsv,
  reportToExcel,
  reportToWordHtml,
  REPORT_TYPE_LABELS,
  type ReportSection,
} from "../lib/consolidatedReport";

const router = Router();
router.use(requireAuth, requireAccess("reports"));

const querySchema = z.object({
  type: z.enum(["AOP", "STRATEGIC", "ROADMAP"]).default("AOP"),
  planId: z.string().optional(),
  periodLabel: z.string().optional(),
  format: z.enum(["json", "csv", "doc", "xls"]).default("json"),
  section: z.enum(["all", "kpis", "milestones", "activities", "owners"]).default("all"),
});

/** Plans available per report type, for the period/plan selector. */
router.get("/plans", async (req, res, next) => {
  try {
    const type = z.string().optional().parse(req.query.type);
    const { plans, current, asOf } = await plansWithCurrentFlag(type as "AOP" | "STRATEGIC" | "ROADMAP" | undefined);
    res.json({
      types: Object.entries(REPORT_TYPE_LABELS).map(([value, label]) => ({ value, label })),
      plans,
      currentPlanIds: current,
      asOf,
    });
  } catch (e) { next(e); }
});

router.get("/", async (req: any, res, next) => {
  try {
    const query = querySchema.parse(req.query);
    const report = await buildConsolidatedReport({
      type: query.type,
      planId: query.planId,
      periodLabel: query.periodLabel,
      generatedBy: req.user?.username,
    });
    if (!report) {
      return res.status(404).json({
        message: `No ${REPORT_TYPE_LABELS[query.type]} plan found for this period. Create or publish the plan first.`,
      });
    }

    if (query.format === "csv") {
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${report.meta.filename}.csv"`);
      return res.send(reportToCsv(report, query.section as ReportSection | "all"));
    }
    if (query.format === "xls") {
      res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${report.meta.filename}.xls"`);
      return res.send(reportToExcel(report));
    }
    if (query.format === "doc") {
      res.setHeader("Content-Type", "application/msword; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${report.meta.filename}.doc"`);
      return res.send(reportToWordHtml(report));
    }
    res.json(report);
  } catch (e) { next(e); }
});

export default router;
