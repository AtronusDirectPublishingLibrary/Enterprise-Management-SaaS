import type { Request, Response, NextFunction } from "express";

/**
 * Structured request logging with tenant/user/request context for observability.
 * Emits JSON lines suitable for log aggregation (ELK/Datadog/CloudWatch/etc.).
 * Disable verbose logging with REQUEST_LOG_LEVEL=error|silent.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const level = (process.env.REQUEST_LOG_LEVEL || "info").toLowerCase();
  if (level === "silent") return next();
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    const user = (req as any).user;
    const status = res.statusCode;
    if (level === "error" && status < 400) return;
    const entry = {
      ts: new Date().toISOString(),
      level: status >= 500 ? "error" : status >= 400 ? "warn" : "info",
      msg: "http_request",
      method: req.method,
      path: req.originalUrl || req.url,
      status,
      ms,
      requestId: (req as any).id || (req.headers["x-request-id"] as string) || null,
      tenantId: user?.tenantId ?? (req as any).tenant?.id ?? null,
      user: user?.username ?? user?.sub ?? null,
      ip: req.ip,
      ua: typeof req.headers["user-agent"] === "string" ? (req.headers["user-agent"] as string).slice(0, 160) : null,
    };
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(entry));
  });
  next();
}
