import { db } from "../client";
import { log_status, webhook_logs } from "../schema";

export async function insertWebhookLog(
  projectId: string,
  webhookId: string,
  correlationId: string,
  status: (typeof log_status.enumValues)[number],
): Promise<void> {
  await db.insert(webhook_logs).values({
    project_id: projectId,
    webhook_id: webhookId,
    correlation_id: correlationId,
    status: status,
  });
}
