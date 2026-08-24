import type { Logger } from "@hqrelay/shared";

declare global {
  namespace Express {
    interface Request {
      rawBody?: string;
      correlationId?: string;
      logger?: Logger;
    }
  }
}

export {};
