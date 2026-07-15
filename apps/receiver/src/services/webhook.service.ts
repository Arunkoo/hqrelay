import { isDuplicate, markAsSeen } from "@hqrelay/shared/src/cache/idempotency";
import { publishWebhook } from "@hqrelay/shared/src/queue/rabbitmq";
import { log_status } from "@hqrelay/shared/src/db/schema";
import { insertWebhookLog } from "@hqrelay/shared/src/db/repository/webhookLog.repository";
import type { Logger } from "@hqrelay/shared/src/logger";

export async function queueWebhook(
  projectId: string,
  payload: unknown,
  correlationId: string,
  webhookId: string,
  logger?: Logger,
): Promise<{ queued: boolean; jobId: string }> {
  let status: (typeof log_status.enumValues)[number];

  //early duplication detection branch...
  const duplicate = await isDuplicate(webhookId);
  if (duplicate) {
    status = "duplicate";
    insertWebhookLog(projectId, webhookId, correlationId, status).catch(
      (error) =>
        logger?.error(
          { err: error, webhookId: webhookId },
          "DB is unable to resolve query",
        ),
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

  insertWebhookLog(projectId, webhookId, correlationId, status).catch((error) =>
    logger?.error(
      { err: error, webhookId: webhookId },
      "DB is unable to resolve query",
    ),
  );
  return { queued: queueRes.queued, jobId: webhookId };
}
