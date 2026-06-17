import { isDuplicate, markAsSeen } from "@hqrelay/shared/src/cache/idempotency";
import { publishWebhook } from "@hqrelay/shared/src/queue/rabbitmq";
import { log_status } from "@hqrelay/shared/src/db/schema";
import { insertWebhookLog } from "@hqrelay/shared/src/db/repository/webhookLog.repository";

export async function queueWebhook(
  projectId: string,
  payload: unknown,
  correlationId: string,
  webhookId: string,
): Promise<{ queued: boolean; jobId: string }> {
  let status: (typeof log_status.enumValues)[number];

  //early duplication detection branch...
  const duplicate = await isDuplicate(webhookId);
  if (duplicate) {
    status = "duplicate";
    insertWebhookLog(projectId, webhookId, correlationId, status).catch((err) =>
      console.error("DB is unable to resolve query", err),
    );
    return { queued: true, jobId: webhookId };
  }

  const queueRes = await publishWebhook(projectId, payload, correlationId);

  if (queueRes.queued) {
    status = "queued";
    await markAsSeen(webhookId);
  } else {
    status = "failed";
  }

  insertWebhookLog(projectId, webhookId, correlationId, status).catch((err) =>
    console.error("DB is unable to resolve query", err),
  );

  console.log(`Queuing webhook for project: ${projectId}`);
  return { queued: queueRes.queued, jobId: webhookId };
}
