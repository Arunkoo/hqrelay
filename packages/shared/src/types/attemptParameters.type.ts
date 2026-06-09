import { status } from "../db/schema";

export type attemptParameters = {
  projectId: string;
  endpointId: string;
  payload: unknown;
  statusCode: number | null;
  status: (typeof status.enumValues)[number];
  attemptNumber: number;
  correlationId: string;
  latencyMs: number | null;
};
