import { Router } from "express";
import { receiveWebhook } from "../controllers/webhook.controller";
import { hmacRequestValidator } from "../middleware/hmac";
import { slidingWindowRateLimiter } from "../middleware/rateLimiter";

const router = Router();

router.post(
  "/:projectId",
  slidingWindowRateLimiter,
  hmacRequestValidator,
  receiveWebhook,
);

export default router;
