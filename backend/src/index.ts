import "dotenv/config";
import express from "express";
import path from "path";
import { prisma } from "./lib/prisma";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import visitorRoutes from './routes/visitors';
import authRoutes       from "./routes/auth";
import passkeyRoutes    from "./routes/passkeys";
import projectRoutes    from "./routes/projects";
import milestoneRoutes  from "./routes/milestones";
import activityRoutes   from "./routes/activities";
import dashboardRoutes  from "./routes/dashboard";
import userRoutes       from "./routes/users";
import { requireRole } from './middleware/rbac';
import auditRoutes from './routes/audit';
import timesheetRoutes from './routes/timesheets';
import recruitmentRoutes from './routes/recruitment';
import jobDescriptionRoutes from './routes/jobDescriptions';
import offboardingRoutes from './routes/offboarding';
import signatureRoutes from './routes/signatures';
import payrollRoutes from './routes/payroll';
import fleetVehicleRoutes from './routes/fleetVehicles';
import fleetDriverRoutes from './routes/fleetDrivers';
import fleetRequestRoutes from './routes/fleetRequests';
import fleetSettingsRoutes from './routes/fleetSettings';
import fleetAnalyticsRoutes from './routes/fleetAnalytics';
import tenantSettingsRoutes from "./routes/tenantSettings";
import tenantExportRoutes from "./routes/tenantExport";
import portalsRoutes from "./routes/portals";
import billingRoutes from "./routes/billing";
import procurementRoutes from "./routes/procurement";
import warehouseRoutes from "./routes/warehouse";
import accountingRoutes from "./routes/accounting";
import maintenanceRoutes from "./routes/maintenance";
import crmRoutes from "./routes/crm";
import externalPortalsRoutes from "./routes/externalPortals";
import helpdeskRoutes from "./routes/helpdesk";
import dmsRoutes from "./routes/dms";
import grcRoutes from "./routes/grc";
import biRoutes from "./routes/bi";
import resourcesRoutes from "./routes/resources";
import contractsRoutes from "./routes/contracts";
import ehsRoutes from "./routes/ehs";
import qmsDocumentRoutes from "./routes/qmsDocuments";
import qmsDeviationRoutes from "./routes/qmsDeviations";
import qmsCapaRoutes from "./routes/qmsCapa";
import qmsChangeRoutes from "./routes/qmsChanges";
import qmsOverviewRoutes from "./routes/qmsOverview";
import { runQmsReminders } from "./lib/qmsReminders";
import fleetCostControlRoutes from './routes/fleetCostControl';
import rideProviderRoutes from './routes/rideProviders';
import rideRequestRoutes from './routes/rideRequests';
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
import teamTaskRoutes   from "./routes/teamTasks";
import notificationRoutes from "./routes/notifications";
import translationRoutes from "./routes/translations";
import publicStatsRoutes from "./routes/publicStats";
import publicQrRoutes from "./routes/publicQr";
import siteSettingsRoutes from "./routes/siteSettings";
import mediaVideoRoutes from "./routes/mediaVideos";
import timelineRoutes from "./routes/timeline";
import newsRoutes from "./routes/news";
import socialRoutes from "./routes/social";
import { runSocialQueue } from "./lib/socialPublisher";
import automationRoutes from "./routes/automation";
import reportingRoutes from "./routes/reporting";
import portfolioRoutes from "./routes/portfolios";
import templateRoutes from "./routes/templates";
import formRoutes from "./routes/forms";
import goalRoutes from "./routes/goals";
import timeRoutes from "./routes/timeTracking";
import planRoutes from "./routes/plans";
import holidayRoutes from "./routes/holidays";
import languageRoutes from "./routes/languages";
import progressUpdateRoutes from "./routes/progressUpdates";
import consolidatedReportRoutes from "./routes/consolidatedReports";
import payslipRoutes from "./routes/payslips";
import homeRoutes from "./routes/home";
import searchRoutes from "./routes/search";
import reportScheduleRoutes from "./routes/reportSchedules";
import fileRoutes from "./routes/files";
import { runDueReportSchedules } from "./lib/reportSchedules";
import { pruneAuditLog } from "./lib/auditRetention";
import { runAuditVerification } from "./lib/auditChain";
import { createAuditCheckpoint } from "./lib/auditCheckpoint";
import { runPlanAlerts } from "./lib/planAlerts";
import { runPeriodLifecycle } from "./lib/periodLifecycle";
import { runExclusiveJob } from "./lib/jobLock";
import { runAsPlatform } from "./lib/tenantContext";
import { errorHandler } from "./middleware/errorHandler";
import { requestId } from "./middleware/requestId";
import { csrfProtection } from "./middleware/csrf";
import { requestLogger } from "./middleware/requestLogger";
import { optionalAuth, requireAccess, requireAuth } from './middleware/auth';
import { assertTurnstileProductionConfig } from "./lib/turnstile";

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

// Do not start a production instance with a half-enabled CAPTCHA. An explicit
// TURNSTILE_ENABLED=false is the only supported opt-out.
assertTurnstileProductionConfig();

app.disable("x-powered-by");
// A reverse proxy must be trusted explicitly; trusting every forwarded header
// would let a client spoof its IP for rate limits and audit trails.
if (process.env.TRUST_PROXY === "true") app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'", "https://challenges.cloudflare.com"],
        frameSrc: ["https://challenges.cloudflare.com"],
        imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "https:"],
        connectSrc: ["'self'", "https://res.cloudinary.com"],
      },
    },
    strictTransportSecurity: IS_PRODUCTION
      ? { maxAge: 31_536_000, includeSubDomains: true, preload: true }
      : false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    crossOriginResourcePolicy: { policy: "same-site" },
    crossOriginEmbedderPolicy: false,
  }),
);
const ALLOWED_ORIGINS = CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean);

if (IS_PRODUCTION) {
  if (!process.env.CORS_ORIGIN) {
    throw new Error("CORS_ORIGIN must be set explicitly in production");
  }
  if (ALLOWED_ORIGINS.includes("*")) {
    throw new Error("CORS_ORIGIN cannot contain '*' in production");
  }
  const insecure = ALLOWED_ORIGINS.filter((origin) => origin.startsWith("http://"));
  if (insecure.length) {
    throw new Error(`CORS_ORIGIN must use HTTPS in production: ${insecure.join(", ")}`);
  }
}

/**
 * Vite moves to the next free port when 5173 is occupied (for example 5174).
 * Those local ports are still the developer's own machine, so accept loopback
 * origins during development only. Production continues to enforce the
 * explicitly configured CORS_ORIGIN list.
 */
function isLocalDevelopmentOrigin(origin: string) {
  if (process.env.NODE_ENV === "production") return false;
  try {
    const parsed = new URL(origin);
    return ["http:", "https:"].includes(parsed.protocol) &&
      ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  } catch {
    return false;
  }
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin) || isLocalDevelopmentOrigin(origin)) {
        return callback(null, true);
      }
      const error: any = new Error(`Origin ${origin} is not allowed by CORS`);
      error.status = 403;
      return callback(error);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(requestId);
app.use(requestLogger);
app.use(rateLimit({ windowMs: 60_000, max: 200 }));
app.use(csrfProtection);

app.get("/api/health", (_req, res) =>
  res.json({ ok: true, version: "1.0.0", timestamp: new Date().toISOString(), uptime: process.uptime() })
);

// Readiness is separate from liveness: a process can be up while PostgreSQL is
// unavailable, and a load balancer must not route to it in that state.
app.get("/api/ready", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.set("Cache-Control", "no-store").json({ ok: true, database: "up" });
  } catch (error) {
    console.error("[ready] database check failed", error);
    res.status(503).json({ ok: false, database: "down" });
  }
});

// Basic observability/metrics endpoint (process + app info). Protect or restrict in production as needed.
app.get("/api/metrics", (_req, res) => {
  const mem = process.memoryUsage();
  res.set("Cache-Control", "no-store").json({
    ok: true,
    uptimeSec: Math.round(process.uptime()),
    memory: { rss: mem.rss, heapUsed: mem.heapUsed, heapTotal: mem.heapTotal },
    node: process.version,
    env: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth",         authRoutes);
app.use("/api/auth/passkeys", passkeyRoutes);
app.use("/api/portals",      portalsRoutes);
app.use("/api/billing",      billingRoutes);
app.use("/api/procurement",      procurementRoutes);
app.use("/api/warehouse",        warehouseRoutes);
app.use("/api/accounting",       accountingRoutes);
app.use("/api/maintenance",      maintenanceRoutes);
app.use("/api/crm",              crmRoutes);
app.use("/api/external-portals", externalPortalsRoutes);
app.use("/api/helpdesk",         helpdeskRoutes);
app.use("/api/dms",              dmsRoutes);
app.use("/api/grc",              grcRoutes);
app.use("/api/bi",               biRoutes);
app.use("/api/resources",        resourcesRoutes);
app.use("/api/contracts",        contractsRoutes);
app.use("/api/ehs",              ehsRoutes);
app.use("/api/visitors",     visitorRoutes);
app.use("/api/projects",     projectRoutes);
app.use("/api/milestones",   milestoneRoutes);
app.use("/api/activities",   activityRoutes);
app.use("/api/workpackages", wpRoutes);
app.use("/api/dashboard",    dashboardRoutes);
app.use("/api/users", requireAuth, requireRole(["admin"]), userRoutes);
app.use("/api/hr", requireAuth, requireAccess("hr"), hrRoutes);
app.use("/api/leave-balances", requireAuth, leaveBalanceRoutes);
app.use("/api/leave-types", requireAuth, requireAccess("hr"), leaveTypeRoutes);
app.use("/api/annual-plans", requireAuth, annualPlanRoutes);
app.use("/api/approvals", requireAuth, approvalRoutes);
app.use("/api/hr-analytics", requireAuth, requireAccess("hrAnalytics"), analyticsRoutes);
app.use("/api/hr-reports", requireAuth, requireAccess("hr"), reportRoutes);
app.use("/api/audit", requireAuth, requireAccess("audit"), auditRoutes);
app.use("/api/timesheets", requireAuth, timesheetRoutes);
app.use("/api/recruitment", requireAuth, requireAccess("recruitment"), recruitmentRoutes);
app.use("/api/job-descriptions", jobDescriptionRoutes);
app.use("/api/offboarding", offboardingRoutes);
app.use("/api/signatures", signatureRoutes);
app.use("/api/payroll", requireAuth, requireAccess("payroll"), payrollRoutes);
app.use("/api/fleet/vehicles", requireAuth, fleetVehicleRoutes);
app.use("/api/fleet/drivers",  requireAuth, fleetDriverRoutes);
app.use("/api/fleet/requests", requireAuth, fleetRequestRoutes);
app.use("/api/fleet/ride-providers", requireAuth, rideProviderRoutes);
app.use("/api/fleet/rides", requireAuth, rideRequestRoutes);
app.use("/api/fleet/settings", requireAuth, fleetSettingsRoutes);
app.use("/api/fleet/analytics", requireAuth, requireAccess("fleet"), fleetAnalyticsRoutes);
app.use("/api/tenant", requireAuth, tenantSettingsRoutes);
app.use("/api/tenant", requireAuth, tenantExportRoutes);
app.use("/api/qms/documents", requireAuth, requireAccess("qms"), qmsDocumentRoutes);
app.use("/api/qms/deviations", requireAuth, requireAccess("qms"), qmsDeviationRoutes);
app.use("/api/qms/capa", requireAuth, requireAccess("qms"), qmsCapaRoutes);
app.use("/api/qms/changes", requireAuth, requireAccess("qms"), qmsChangeRoutes);
app.use("/api/qms/overview", requireAuth, requireAccess("qms"), qmsOverviewRoutes);
app.use("/api/fleet/cost-control", requireAuth, fleetCostControlRoutes);
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
app.use("/api/team-tasks",   requireAuth, teamTaskRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/translations", translationRoutes);
app.use("/api/languages", languageRoutes);
app.use("/api/progress-updates", progressUpdateRoutes);
app.use("/api/consolidated-reports", consolidatedReportRoutes);
app.use("/api/report-schedules", reportScheduleRoutes);
app.use("/api/payslips", payslipRoutes);
app.use("/api/home", homeRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/timeline", timelineRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/social", socialRoutes);
app.use("/api/automation", automationRoutes);
app.use("/api/reporting", reportingRoutes);
app.use("/api/portfolios", requireAuth, requireRole(["admin", "executive", "project_manager"]), portfolioRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/forms", formRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/time", timeRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/holidays", holidayRoutes);
app.use("/api/public/qr", publicQrRoutes);
app.use("/api/public", publicStatsRoutes);
app.use("/api/site-settings", siteSettingsRoutes);
app.use("/api/media", mediaVideoRoutes);

// Social distribution worker. Runs per active tenant (social posts/news are tenant-scoped).
// Disabled with SOCIAL_AUTORUN=false.
if (process.env.SOCIAL_AUTORUN !== "false") {
  const tick = () => {
    runExclusiveJob("social-queue", async () => {
      const { runPerTenant } = await import("./lib/tenantJobs");
      const results = await runPerTenant("social-queue", async () => runSocialQueue(20));
      const ok = results.filter(r => r.ok).map(r => r.result as any).filter(Boolean);
      const agg = ok.reduce((a,s)=>({ evaluated: a.evaluated+(s.evaluated||0), sent: a.sent+(s.sent||0), skipped: a.skipped+(s.skipped||0), failed: a.failed+(s.failed||0) }), { evaluated:0,sent:0,skipped:0,failed:0 });
      if (agg.evaluated) {
        console.log(`[social] tenants=${ok.length}/${results.length} evaluated=${agg.evaluated} sent=${agg.sent} skipped=${agg.skipped} failed=${agg.failed}`);
      }
      return agg;
    })
      .then(({ skipped }) => skipped && null)
      .catch((error) => console.error("[social] queue run failed", error));
  };
  setTimeout(tick, 25_000);
  setInterval(tick, 5 * 60 * 1000).unref();
}

// Only editorial/brand assets are public. HR documents, signatures, CVs,
// QMS records and the internal archive are delivered through /api/files with
// record-level authorization.
const publicUploadDirs = ["avatars", "brand", "hero", "media", "news"];
for (const dir of publicUploadDirs) {
  app.use(
    `/uploads/${dir}`,
    express.static(path.join(process.cwd(), "uploads", dir), {
      index: false,
      dotfiles: "deny",
      maxAge: "1h",
    }),
  );
}

app.use("/api/files", optionalAuth, fileRoutes);

app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`BEMS API listening on http://localhost:${PORT}`);
  console.log(`  CORS origin: ${CORS_ORIGIN}`);
});
server.requestTimeout = Number(process.env.REQUEST_TIMEOUT_MS) || 30_000;
server.headersTimeout = Number(process.env.HEADERS_TIMEOUT_MS) || 35_000;
server.keepAliveTimeout = Number(process.env.KEEP_ALIVE_TIMEOUT_MS) || 65_000;

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[shutdown] ${signal} received; draining connections`);
  const force = setTimeout(() => {
    console.error("[shutdown] graceful drain timed out");
    process.exit(1);
  }, 15_000);
  force.unref();
  server.close(async () => {
    try {
      await prisma.$disconnect();
    } finally {
      clearTimeout(force);
      process.exit(0);
    }
  });
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));
process.on("unhandledRejection", (reason) => console.error("[process] unhandled rejection", reason));
process.on("uncaughtException", (error) => {
  console.error("[process] uncaught exception", error);
  void shutdown("uncaughtException");
});

// HR due-date reminders: once shortly after boot, then every six hours.
// Runs per active tenant to preserve tenant context/attribution.
const runRemindersSafely = () =>
  runExclusiveJob("hr-reminders", async () => {
    const { runPerTenant } = await import("./lib/tenantJobs");
    const results = await runPerTenant("hr-reminders", async () => runHrReminders());
    const ok = results.filter(r => r.ok).map(r => r.result as any).filter(Boolean);
    return { tenants: ok.length, sent: ok.reduce((a,s)=>a+(s.sent||0),0), skipped: ok.reduce((a,s)=>a+(s.skipped||0),0) };
  })
    .then(({ skipped, result }) => skipped ? undefined : console.log(`[hr-reminders] tenants=${result.tenants} sent ${result.sent}, skipped ${result.skipped}`))
    .catch((error) => console.error("[hr-reminders] failed", error));

setTimeout(runRemindersSafely, 10_000);
setInterval(runRemindersSafely, 6 * 60 * 60 * 1000).unref();

// Background KPI / reporting-deadline watch. Disable with PLAN_ALERTS_AUTORUN=false.
// Runs per active tenant to preserve tenant attribution/context.
if (process.env.PLAN_ALERTS_AUTORUN !== "false") {
  const intervalHours = Math.max(1, Number(process.env.PLAN_ALERT_INTERVAL_HOURS) || 6);
  const tick = () => {
    runExclusiveJob("plan-alerts", async () => {
      const { runPerTenant } = await import("./lib/tenantJobs");
      const results = await runPerTenant("plan-alerts", async () => runPlanAlerts());
      const ok = results.filter(r => r.ok).map(r => r.result as any).filter(Boolean);
      const summary = ok.reduce((acc, s) => ({
        created: acc.created + (s.created || 0),
        resolved: acc.resolved + (s.resolved || 0),
        emailsSent: acc.emailsSent + (s.emailsSent || 0),
        emailsFailed: acc.emailsFailed + (s.emailsFailed || 0),
        plans: acc.plans + (s.evaluated?.plans || 0),
      }), { created: 0, resolved: 0, emailsSent: 0, emailsFailed: 0, plans: 0 });
      if (summary.created || summary.emailsSent || summary.emailsFailed || ok.length) {
        console.log(`[plan-alerts] tenants=${ok.length}/${results.length} plans=${summary.plans} new=${summary.created} resolved=${summary.resolved} mail=${summary.emailsSent}/${summary.emailsFailed}`);
      }
      return summary;
    }, 2 * 60 * 60 * 1000)
      .then(({ skipped }) => skipped && null)
      .catch((error) => console.error("[plan-alerts] run failed", error));
  };
  setTimeout(tick, 15_000);
  setInterval(tick, intervalHours * 3_600_000).unref();
}

// Daily planning-period lifecycle per active tenant. Runs idempotently.
// Disable with PERIOD_LIFECYCLE_AUTORUN=false.
if (process.env.PERIOD_LIFECYCLE_AUTORUN !== "false") {
  const intervalHours = Math.max(1, Number(process.env.PERIOD_LIFECYCLE_INTERVAL_HOURS) || 24);
  const tick = () => {
    runExclusiveJob("period-lifecycle", async () => {
      const { runPerTenant } = await import("./lib/tenantJobs");
      const results = await runPerTenant("period-lifecycle", async () => runPeriodLifecycle());
      const ok = results.filter(r => r.ok).map(r => r.result as any).filter(Boolean);
      const agg = ok.reduce((a,s)=>({
        prepared: a.prepared + (s.prepared?.length||0),
        activated: a.activated + (s.activated?.length||0),
        closed: a.closed + (s.closed?.length||0),
        archived: a.archived + (s.archived?.length||0),
        warnings: a.warnings + (s.warnings?.length||0),
      }), { prepared:0, activated:0, closed:0, archived:0, warnings:0 });
      if (agg.prepared+agg.activated+agg.closed+agg.archived+agg.warnings > 0) {
        console.log(`[periods] tenants=${ok.length}/${results.length} prepared=${agg.prepared} activated=${agg.activated} closed=${agg.closed} archived=${agg.archived} warnings=${agg.warnings}`);
      }
      return agg;
    }, 2 * 60 * 60 * 1000)
      .then(({ skipped }) => skipped && null)
      .catch((error) => console.error("[periods] lifecycle run failed", error));
  };
  setTimeout(tick, 20_000);
  setInterval(tick, intervalHours * 3_600_000).unref();
}

// Scheduled consolidated-report delivery per active tenant.
// Disable with REPORT_SCHEDULES_AUTORUN=false.
if (process.env.REPORT_SCHEDULES_AUTORUN !== "false") {
  const tick = () => {
    runExclusiveJob("report-schedules", async () => {
      const { runPerTenant } = await import("./lib/tenantJobs");
      const results = await runPerTenant("report-schedules", async () => runDueReportSchedules());
      const ok = results.filter(r => r.ok).map(r => r.result as any).filter(Boolean);
      const agg = ok.reduce((a,s)=>({ evaluated: a.evaluated+(s.evaluated||0), sent: a.sent+(s.sent||0), skipped: a.skipped+(s.skipped||0), failed: a.failed+(s.failed||0) }), { evaluated:0,sent:0,skipped:0,failed:0 });
      if (agg.evaluated) {
        console.log(`[report-schedules] tenants=${ok.length}/${results.length} due=${agg.evaluated} sent=${agg.sent} skipped=${agg.skipped} failed=${agg.failed}`);
      }
      return agg;
    }, 2 * 60 * 60 * 1000)
      .then(({ skipped }) => skipped && null)
      .catch((error) => console.error("[report-schedules] run failed", error));
  };
  setTimeout(tick, 30_000);
  setInterval(tick, 15 * 60 * 1000).unref();
}

// Audit retention: prune entries older than AUDIT_RETENTION_DAYS (default 365).
// Disable with AUDIT_RETENTION_AUTORUN=false.
if (process.env.AUDIT_RETENTION_AUTORUN !== "false") {
  const tick = () => {
    runExclusiveJob("audit-retention", () => runAsPlatform(() => pruneAuditLog()), 2 * 60 * 60 * 1000)
      .then(({ skipped, result: summary }) => {
        if (skipped) return;
        if (summary.deleted) {
          console.log(`[audit-retention] pruned ${summary.deleted} entries older than ${summary.retentionDays} days`);
        }
      })
      .catch((error) => console.error("[audit-retention] prune failed", error));
  };
  setTimeout(tick, 60_000);
  setInterval(tick, 24 * 60 * 60 * 1000).unref();
}

// Daily audit-chain verification. The result is stored in audit_verification;
// it is deliberately not appended to audit_log, so checking the chain never
// changes the evidence it is checking.
if (process.env.AUDIT_VERIFY_AUTORUN !== "false") {
  const tick = () => {
    runExclusiveJob("audit-verification", () => runAsPlatform(() => runAuditVerification("system")), 2 * 60 * 60 * 1000)
      .then(({ skipped, result }) => {
        if (skipped) return;
        if (!result.valid || result.legacyCount || result.truncated) {
          console.log(
            `[audit-chain] valid=${result.valid} checked=${result.checkedCount} legacy=${result.legacyCount} truncated=${result.truncated} brokenAt=${result.brokenAt || "none"}`,
          );
        }
      })
      .catch((error) => console.error("[audit-chain] verification run failed", error));
  };
  setTimeout(tick, 90_000);
  setInterval(tick, 24 * 60 * 60 * 1000).unref();
}

// Signed checkpoints are optional until the deployment supplies an Ed25519
// private key. They anchor the audit head outside the database.
if (process.env.AUDIT_CHECKPOINT_AUTORUN !== "false" && process.env.AUDIT_CHECKPOINT_PRIVATE_KEY) {
  const tick = () => {
    runExclusiveJob("audit-checkpoint", () => runAsPlatform(() => createAuditCheckpoint("system")), 2 * 60 * 60 * 1000)
      .then(({ skipped, result }) => {
        if (skipped) return;
        console.log(`[audit-checkpoint] created ${result.id} at head ${result.headId.toString()}`);
      })
      .catch((error) => console.error("[audit-checkpoint] run failed", error));
  };
  setTimeout(tick, 5 * 60_000);
  setInterval(tick, 24 * 60 * 60 * 1000).unref();
}
// QMS review-due reminders per active tenant. Runs daily.
const runQmsRemindersSafely = () =>
  runExclusiveJob("qms-reminders", async () => {
    const { runPerTenant } = await import("./lib/tenantJobs");
    const results = await runPerTenant("qms-reminders", async () => runQmsReminders());
    const ok = results.filter(r => r.ok).map(r => r.result as any).filter(Boolean);
    return { tenants: ok.length, sent: ok.reduce((a,s)=>a+(s.sent||0),0) };
  })
    .then(({ skipped, result }) => {
      if (skipped) return;
      if (result.sent) console.log(`[qms-reminders] tenants=${result.tenants} sent ${result.sent}`);
    })
    .catch((error) => console.error("[qms-reminders] failed", error));

setTimeout(runQmsRemindersSafely, 45_000);
setInterval(runQmsRemindersSafely, 24 * 60 * 60 * 1000).unref();
