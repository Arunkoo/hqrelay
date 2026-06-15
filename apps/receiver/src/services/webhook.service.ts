import { isDuplicate, markAsSeen } from "@hqrelay/shared/src/cache/idempotency";
import { publishWebhook } from "@hqrelay/shared/src/queue/rabbitmq";

export async function queueWebhook(
  projectId: string,
  payload: unknown,
  correlationId: string,
  webhookId: string,
): Promise<{ queued: boolean; jobId: string }> {
  const duplicate = await isDuplicate(webhookId);
  if (duplicate) {
    return { queued: true, jobId: webhookId };
  }

  const queueRes = await publishWebhook(projectId, payload, correlationId);

  if (queueRes.queued) {
    await markAsSeen(webhookId);
  }

  // TODO: log to Postgres via repository
  console.log(`Queuing webhook for project: ${projectId}`, payload);
  return { queued: queueRes.queued, jobId: webhookId }; //using randomUUId AS CURRENTLY WE HAVE NO queue service..
}
