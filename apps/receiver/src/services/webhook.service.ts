import { randomUUID } from "crypto";

export async function queueWebhook(
  projectId: string,
  payload: unknown,
): Promise<{ queued: boolean; jobId: string }> {
  // TODO: verify HMAC signature
  // TODO: check idempotency key in Redis
  // TODO: publish to RabbitMQ
  // TODO: log to Postgres via repository
  console.log(`Queuing webhook for project: ${projectId}`, payload);
  return { queued: true, jobId: randomUUID() }; //using randomUUId AS CURRENTLY WE HAVE NO queue service..
}
