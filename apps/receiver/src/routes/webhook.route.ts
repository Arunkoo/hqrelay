import { Router } from "express";
import { receiveWebhook } from "../controllers/webhook.controller";

const router = Router();

router.post("/:projectId", receiveWebhook);

export default router;
