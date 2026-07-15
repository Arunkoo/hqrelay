import { Request, Response } from "express";
import { queueWebhook } from "../services/webhook.service";
import { createHash } from "crypto";

export async function receiveWebhook(req: Request, res: Response) {
  const projectId = req.params.projectId as string;
  const payload = req.body as unknown;
  const correlationId = req.correlationId!;
  const webhookId =
    req.headers["x-webhook-id"] || getFallBack(projectId, payload);

  try {
    const queueRes = await queueWebhook(
      projectId,
      payload,
      correlationId,
      webhookId as string,
      req.logger,
    );
    if (queueRes.queued) {
      req.logger?.info("webhook received");
      return res.status(202).json({
        message: "webhook received",
        jobId: queueRes.jobId,
      });
    } else {
      req.logger?.error("Retry again unable to queue webhook");
      return res.status(500).json({
        message: "Retry again unable to queue webhook",
        jobId: queueRes.jobId,
      });
    }
  } catch (error) {
    req.logger?.error({ err: error }, "Internal server error");
    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

function getFallBack(projectId: string, payload: unknown): string {
  const fallBack = createHash("sha256")
    .update(projectId + JSON.stringify(payload))
    .digest("hex");

  return fallBack;
}
