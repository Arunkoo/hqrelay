import { Router } from "express";
import { receiveWebhook } from "../controllers/webhook.controller";
import { hmacRequestValidator } from "../middleware/hmac";

const router = Router();

router.post("/:projectId", hmacRequestValidator, receiveWebhook);

export default router;
