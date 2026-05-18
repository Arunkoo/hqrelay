import { Request, Response } from "express";
import { queueWebhook } from "../services/webhook.service";

export async function receiveWebhook(req: Request, res: Response) {
  const projectId = req.params.projectId as string;
  const payload = req.body;
  try {
    const queueRes = await queueWebhook(projectId, payload);

    return res.status(202).json({
      message: "webhook received",
      jobId: queueRes.jobId,
    });
  } catch (error) {
    console.error("Failed to queue webhook:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
}
