import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { createLogger } from "@hqrelay/shared/src/logger";

const baseLogger = createLogger("receiver");

export function setCorrelationId(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const correlationId = (req.headers["x-request-id"] ||
    req.headers["x-correlation-id"] ||
    randomUUID()) as string;

  req.correlationId = correlationId;
  req.logger = baseLogger.child({ correlationId });

  res.setHeader("x-correlation-id", correlationId);
  req.logger.info("Request received");

  return next();
}
