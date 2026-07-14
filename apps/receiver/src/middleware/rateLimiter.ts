import { isRateLimited } from "@hqrelay/shared/src/cache/slidingWindowRateLimit";
import { Request, Response, NextFunction } from "express";

export async function slidingWindowRateLimiter(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const projectId = req.params.projectId as string;
  if (!projectId) return res.status(400).json({ message: "Bad request" });

  try {
    const isInvalidReq = await isRateLimited(projectId);

    if (isInvalidReq) {
      req.logger?.warn(
        { projectId: projectId },
        "429 Too many frequent request",
      );
      return res.status(429).json({
        message: "Too many frequent request",
      });
    }

    next();
  } catch (error) {
    req.logger?.error({ err: error }, "redis service is down");

    return next(); //Important point that my system need available despite of redis down.  fails open method..  hmac there to verify if person is valid or not...
  }
}
