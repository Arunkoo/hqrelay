import { pino } from "pino";

export function createLogger(serviceName: string) {
  return pino({
    level: process.env.LOG_LEVEL || "info",
    base: { service: serviceName },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}
