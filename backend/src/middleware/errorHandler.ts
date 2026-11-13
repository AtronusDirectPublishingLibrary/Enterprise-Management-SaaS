import { Request, Response, NextFunction } from "express";

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const requestId = res.locals.requestId || "unknown";
  if (err?.name === "ZodError" && Array.isArray(err.issues)) {
    const message = err.issues
      .map((issue: any) => `${issue.path?.join(".") || "input"}: ${issue.message}`)
      .join("; ");
    return res.status(400).json({ message: message || "Invalid request" });
  }

  // Map the small set of Prisma errors that can safely be described to a
  // caller. Everything else is logged and hidden in production.
  const prismaCode = err?.code;
  const status =
    prismaCode === "P2002" ? 409
      : prismaCode === "P2025" ? 404
        : prismaCode === "P2000" ? 400
          : err.status || err.statusCode || 500;

  console.error(`API error [${requestId}]`, err);
  if (res.headersSent) return;

  if (process.env.NODE_ENV === "production" && status >= 500) {
    return res.status(500).json({ error: "Internal server error", requestId });
  }
  if (prismaCode === "P2002") {
    return res.status(409).json({ error: "A record with that value already exists", requestId });
  }
  if (prismaCode === "P2025") {
    return res.status(404).json({ error: "Record not found", requestId });
  }
  if (prismaCode === "P2000") {
    return res.status(400).json({ error: "A value is too long for this field", requestId });
  }
  res.status(status).json({ message: err.message || "Internal server error", requestId });
}
