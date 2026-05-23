import { Request, Response, NextFunction } from "express";
import { createHash } from "crypto";

export function apiAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({
      message: "authentication Failed",
    });
  }

  const apiKey = authHeader?.split(" ")[1];

  if (!apiKey) {
    return res.status(401).json({
      message: "unauthorized",
    });
  }

  const hashedKey = createHash("sha256").update(apiKey).digest("hex");

  if (hashedKey !== process.env.API_KEY_HASH) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  return next();
}
