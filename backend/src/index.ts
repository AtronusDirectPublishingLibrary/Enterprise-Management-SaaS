import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import visitorRoutes from './routes/visitors';
import authRoutes       from "./routes/auth";
import projectRoutes    from "./routes/projects";
import milestoneRoutes  from "./routes/milestones";
import activityRoutes   from "./routes/activities";
import dashboardRoutes  from "./routes/dashboard";
import userRoutes       from "./routes/users";
import { requireRole } from './middleware/rbac';
import auditRoutes from './routes/audit';
import timesheetRoutes from './routes/timesheets';
import recruitmentRoutes from './routes/recruitment';
import payrollRoutes from './routes/payroll';
import trainingAlertRoutes from './routes/trainingAlerts';
import hrSelfRoutes from './routes/hrSelf';
import { runHrReminders } from './lib/hrReminders';
import inductionRoutes from './routes/induction';
import appraisalRoutes from './routes/appraisals';
import publicJobRoutes from './routes/publicJobs';
import leaveBalanceRoutes from './routes/leaveBalances';
import leaveTypeRoutes from './routes/leaveTypes';
import annualPlanRoutes from './routes/annualPlans';
import approvalRoutes from './routes/approvals';
import analyticsRoutes from './routes/hrAnalytics';
import reportRoutes from './routes/reports';
import hrRoutes         from "./routes/hr";
import wpRoutes         from "./routes/workPackages";
import documentRoutes   from "./routes/documents";
import heroImageRoutes  from "./routes/heroImages";
import heroTextRoutes   from "./routes/heroTexts";
import dropdownRoutes   from "./routes/dropdowns";
import commentRoutes    from "./routes/comments";
import messageRoutes    from "./routes/messages";
import briefRoutes      from "./routes/briefs";
import memberRoutes     from "./routes/members";
import notificationRoutes from "./routes/notifications";
import translationRoutes from "./routes/translations";
import publicStatsRoutes from "./routes/publicStats";
import siteSettingsRoutes from "./routes/siteSettings";
import mediaVideoRoutes from "./routes/mediaVideos";
import timelineRoutes from "./routes/timeline";
import newsRoutes from "./routes/news";
import automationRoutes from "./routes/automation";
import reportingRoutes from "./routes/reporting";
import portfolioRoutes from "./routes/portfolios";
import templateRoutes from "./routes/templates";
import formRoutes from "./routes/forms";
import goalRoutes from "./routes/goals";
import timeRoutes from "./routes/timeTracking";
import planRoutes from "./routes/plans";
import { runPlanAlerts } from "./lib/planAlerts";
import { runPeriodLifecycle } from "./lib/periodLifecycle";
import { errorHandler } from "./middleware/errorHandler";
import { requireAuth } from './middleware/auth';

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

app.use(helmet({ crossOriginResourcePolicy: false }));
const ALLOWED_ORIGINS = CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) =>
      !origin || ALLOWED_ORIGINS.includes(origin)
        ? callback(null, true)
        : callback(new Error(`Origin ${origin} is not allowed by CORS`)),
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(rateLimit({ windowMs: 60_000, max: 200 }));

app.get("/api/health", (_req, res) =>
  res.json({ ok: true, version: "1.0.0", timestamp: new Date().toISOString() })
);

app.use("/api/auth",         authRoutes);
app.use("/api/visitors",     visitorRoutes);
app.use("/api/projects",     projectRoutes);
app.use("/api/milestones",   milestoneRoutes);
app.use("/api/activities",   activityRoutes);
app.use("/api/workpackages", wpRoutes);
app.use("/api/dashboard",    dashboardRoutes);
app.use("/api/users", requireAuth, requireRole(["admin"]), userRoutes);
app.use("/api/hr", requireAuth, requireRole(["admin", "executive"]), hrRoutes);
app.use("/api/leave-balances", requireAuth, leaveBalanceRoutes);
app.use("/api/leave-types", requireAuth, requireRole(["admin", "executive"]), leaveTypeRoutes);
app.use("/api/annual-plans", requireAuth, annualPlanRoutes);
app.use("/api/approvals", requireAuth, approvalRoutes);
app.use("/api/hr-analytics", requireAuth, requireRole(["admin", "executive"]), analyticsRoutes);
app.use("/api/hr-reports", requireAuth, requireRole(["admin", "executive"]), reportRoutes);
app.use("/api/audit", requireAuth, requireRole(["admin", "executive"]), auditRoutes);
app.use("/api/timesheets", requireAuth, timesheetRoutes);
app.use("/api/recruitment", requireAuth, requireRole(["admin", "executive"]), recruitmentRoutes);
app.use("/api/payroll", requireAuth, requireRole(["admin"]), payrollRoutes);
app.use("/api/training-alerts", requireAuth, requireRole(["admin", "executive"]), trainingAlertRoutes);
app.use("/api/hr-self",       hrSelfRoutes);
app.use("/api/induction",     requireAuth, inductionRoutes);
app.use("/api/appraisals",    requireAuth, appraisalRoutes);
app.use("/api/careers", publicJobRoutes);
app.use("/api/documents",    documentRoutes);
app.use("/api/hero-images",  heroImageRoutes);
app.use("/api/hero-texts",   heroTextRoutes);
app.use("/api/dropdowns",    dropdownRoutes);
app.use("/api/comments",     commentRoutes);
app.use("/api/messages",     messageRoutes);
app.use("/api/briefs",       briefRoutes);
app.use("/api/members",      memberRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/translations", translationRoutes);
app.use("/api/timeline", timelineRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/automation", automationRoutes);
app.use("/api/reporting", reportingRoutes);
app.use("/api/portfolios", requireAuth, requireRole(["admin", "executive", "project_manager"]), portfolioRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/forms", formRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/time", timeRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/public", publicStatsRoutes);
app.use("/api/site-settings", siteSettingsRoutes);
app.use("/api/media", mediaVideoRoutes);

app.use("/uploads", express.static("uploads"));

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Ethio-Biopharma API listening on http://localhost:${PORT}`);
  console.log(`  CORS origin: ${CORS_ORIGIN}`);
});

// HR due-date reminders: once shortly after boot, then every six hours so the
// notification bell stays current without a separate cron service.
const runRemindersSafely = () =>
  runHrReminders()
    .then((result) => console.log(`[hr-reminders] sent ${result.sent}, skipped ${result.skipped}`))
    .catch((error) => console.error("[hr-reminders] failed", error));

setTimeout(runRemindersSafely, 10_000);
setInterval(runRemindersSafely, 6 * 60 * 60 * 1000).unref();

// Background KPI / reporting-deadline watch. Disable with PLAN_ALERTS_AUTORUN=false.
if (process.env.PLAN_ALERTS_AUTORUN !== "false") {
  const intervalHours = Math.max(1, Number(process.env.PLAN_ALERT_INTERVAL_HOURS) || 6);
  const tick = () => {
    runPlanAlerts()
      .then((summary) => {
        if (summary.created || summary.emailsSent || summary.emailsFailed) {
          console.log(
            `[plan-alerts] plans=${summary.evaluated.plans} new=${summary.created} resolved=${summary.resolved} mail=${summary.emailsSent}/${summary.emailsFailed}`
          );
        }
      })
      .catch((error) => console.error("[plan-alerts] run failed", error));
  };
  setTimeout(tick, 15_000);
  setInterval(tick, intervalHours * 3_600_000).unref();
}

// Daily planning-period lifecycle: prepare the next period, activate approved
// periods, close ended ones and archive superseded ones. Runs idempotently.
// Disable with PERIOD_LIFECYCLE_AUTORUN=false.
if (process.env.PERIOD_LIFECYCLE_AUTORUN !== "false") {
  const intervalHours = Math.max(1, Number(process.env.PERIOD_LIFECYCLE_INTERVAL_HOURS) || 24);
  const tick = () => {
    runPeriodLifecycle()
      .then((summary) => {
        const changed =
          summary.prepared.length +
          summary.activated.length +
          summary.closed.length +
          summary.archived.length;
        if (changed || summary.warnings.length) {
          console.log(
            `[periods] prepared=${summary.prepared.length} activated=${summary.activated.length} closed=${summary.closed.length} archived=${summary.archived.length} warnings=${summary.warnings.length}`
          );
        }
      })
      .catch((error) => console.error("[periods] lifecycle run failed", error));
  };
  setTimeout(tick, 20_000);
  setInterval(tick, intervalHours * 3_600_000).unref();
}