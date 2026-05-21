declare global {
  namespace Express {
    interface Request {
      rawBody?: string;
      correlationId?: string;
    }
  }
}

export {};
