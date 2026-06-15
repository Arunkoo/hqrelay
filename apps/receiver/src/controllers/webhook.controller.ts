import { Request, Response } from "express";
import { queueWebhook } from "../services/webhook.service";
import { randomUUID } from "crypto";

export async function receiveWebhook(req: Request, res: Response) {
  const projectId = req.params.projectId as string;
  const payload = req.body;
  const correlationId = req.correlationId!;
  const webhookId = req.headers["x-webhook-id"] || randomUUID();
  try {
    const queueRes = await queueWebhook(
      projectId,
      payload,
      correlationId,
      webhookId as string,
    );
    if (queueRes.queued) {
      return res.status(202).json({
        message: "webhook received",
        jobId: queueRes.jobId,
      });
    } else {
      return res.status(500).json({
        message: "Retry again unable to queue webhook",
        jobId: queueRes.jobId,
      });
    }
  } catch (error) {
    console.error("Failed to queue webhook:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
}
