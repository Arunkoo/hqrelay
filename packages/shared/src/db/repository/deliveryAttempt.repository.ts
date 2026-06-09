import { attemptParameters } from "../../types/attemptParameters.type";
import { db } from "../client";
import { delivery_attempts } from "../schema";

export async function insertDeliveryAttempt(
  data: attemptParameters,
): Promise<{ id: string }[]> {
  const result = await db
    .insert(delivery_attempts)
    .values({
      project_id: data.projectId,
      endpoint_id: data.endpointId,
      payload: data.payload,
      status_code: data.statusCode,
      status: data.status,
      attempt_num: data.attemptNumber,
      correlation_id: data.correlationId,
      latency_ms: data.latencyMs,
    })
    .returning({ id: delivery_attempts.id });

  return result;
}
