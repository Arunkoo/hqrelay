import { Logger } from "@hqrelay/shared/src/logger/index";

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
