import crypto from "crypto";
import { NextFunction, Request, Response } from "express";

/**
 * Correlates the client-visible error with the server log without exposing
 * stack traces. Incoming X-Request-Id is accepted only when it is short and
 * alphanumeric so a caller cannot inject arbitrary log content.
 */
export function requestId(req: Request, res: Response, next: NextFunction) {
  const incoming = req.headers["x-request-id"];
  const candidate = typeof incoming === "string" ? incoming.trim() : "";
  const id = /^[A-Za-z0-9._:-]{8,80}$/.test(candidate) ? candidate : crypto.randomUUID();
  res.locals.requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
}
