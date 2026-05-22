import { Request, Response, NextFunction } from "express";

//constants
const Window_Ms = 60 * 1000;
const Max_Requests = 100;

interface RateLimiterEntry {
  counter: number;
  windowStart: number;
}

const reqCount = new Map<string, RateLimiterEntry>(); //placeholder for redis...

function getOrCreateEntry(projectId: string): RateLimiterEntry {
  if (!reqCount.has(projectId)) {
    reqCount.set(projectId, { counter: 0, windowStart: Date.now() });
  }
  return reqCount.get(projectId) as RateLimiterEntry;
}

function isWindowExpired(entry: RateLimiterEntry): boolean {
  return Date.now() - entry.windowStart > Window_Ms;
}

function resetWindow(entry: RateLimiterEntry): void {
  entry.counter = 0;
  entry.windowStart = Date.now();
}

export function slidingWindowRateLimiter(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const projectId = req.params.projectId as string;
  if (!projectId) return res.status(400).json({ message: "Bad request" });

  const entry = getOrCreateEntry(projectId);

  if (isWindowExpired(entry)) resetWindow(entry);

  if (entry.counter >= Max_Requests) {
    const retryAfterTime = Math.ceil(
      (entry.windowStart + Window_Ms - Date.now()) / 1000,
    );
    return res.status(429).json({
      message: "Too many requests",
      retryAfter: `Retry after ${retryAfterTime} seconds.`,
    });
  }

  entry.counter++;
  next();
}
