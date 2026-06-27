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
    console.log(`redis resolved value: ${isInvalidReq}`);

    if (isInvalidReq) {
      return res.status(429).json({
        message: "Too many frequent request",
      });
    }

    next();
  } catch (error) {
    console.error("[Redis]:Client is unable to resolve request");

    return next(); //Important point that my system need available despite of redis down.  fails open method..  hmac there to verify if person is valid or not...
  }
}
