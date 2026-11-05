import { Request, Response, NextFunction } from "express";

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (err?.name === "ZodError" && Array.isArray(err.issues)) {
    const message = err.issues
      .map((issue: any) => `${issue.path?.join(".") || "input"}: ${issue.message}`)
      .join("; ");
    return res.status(400).json({ message: message || "Invalid request" });
  }
  console.error("API error:", err);
  const status = err.status || 500;
  res.status(status).json({ message: err.message || "Internal server error" });
}
