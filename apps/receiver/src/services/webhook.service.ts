import {
  isDuplicate,
  markAsSeen,
  publishWebhook,
  log_status,
  insertWebhookLog,
  Logger,
} from "@hqrelay/shared";

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
