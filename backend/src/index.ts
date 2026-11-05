import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import authRoutes       from "./routes/auth";
import projectRoutes    from "./routes/projects";
import milestoneRoutes  from "./routes/milestones";
import activityRoutes   from "./routes/activities";
import dashboardRoutes  from "./routes/dashboard";
import userRoutes       from "./routes/users";
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
import { errorHandler } from "./middleware/errorHandler";

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
app.use("/api/projects",     projectRoutes);
app.use("/api/milestones",   milestoneRoutes);
app.use("/api/activities",   activityRoutes);
app.use("/api/workpackages", wpRoutes);
app.use("/api/dashboard",    dashboardRoutes);
app.use("/api/users",        userRoutes);
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
app.use("/api/portfolios", portfolioRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/forms", formRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/time", timeRoutes);
app.use("/api/plans", planRoutes);

app.use("/uploads", express.static("uploads"));

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Ethio-Biopharma API listening on http://localhost:${PORT}`);
  console.log(`  CORS origin: ${CORS_ORIGIN}`);
});

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
