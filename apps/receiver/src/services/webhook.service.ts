import { publishWebhook } from "@hqrelay/shared/src/queue/rabbitmq";
import { randomUUID } from "crypto";

export async function queueWebhook(
  projectId: string,
  payload: unknown,
  correlationId: string,
): Promise<{ queued: boolean; jobId: string }> {
  // TODO: check idempotency key in Redis
  const queueRes = await publishWebhook(projectId, payload, correlationId);
  // TODO: log to Postgres via repository
  console.log(`Queuing webhook for project: ${projectId}`, payload);
  return { queued: queueRes.queued, jobId: randomUUID() }; //using randomUUId AS CURRENTLY WE HAVE NO queue service..
}
