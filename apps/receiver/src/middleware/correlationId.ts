import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
export function setCorrelationId(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  let correlationId =
    req.headers["x-request-id"] ||
    req.headers["x-correlation-id"] ||
    randomUUID();

  req.correlationId = correlationId as string;

  res.setHeader("x-correlation-id", correlationId as string); //sent back correlationId to client.
  console.log(`[${correlationId}] request received`);

  return next();
}
