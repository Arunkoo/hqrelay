import { Router } from "express";
import { receiveWebhook } from "../controllers/webhook.controller";
import { hmacRequestValidator } from "../middleware/hmac";
import { slidingWindowRateLimiter } from "../middleware/rateLimiter";

const router = Router();

/**
 * @openapi
 * /v1/webhooks/{projectId}:
 *   post:
 *     summary: Receive webhook, verify HMAC, queue for delivery
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       202:
 *         description: Webhook received and queued
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Server error
 */

router.post(
  "/:projectId",
  slidingWindowRateLimiter,
  hmacRequestValidator,
  receiveWebhook,
);

export default router;
