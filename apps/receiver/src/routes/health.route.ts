import { Request, Response, Router } from "express";
import { healthCheck } from "../services/health.service";

const router = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns server status
 *     responses:
 *       200:
 *         description: Server is alive
 */

router.get("/health", async (_req: Request, res: Response) => {
  const result = await healthCheck();

  if (result.status == "ok") {
    return res.status(200).json(result);
  } else {
    return res.status(503).json(result);
  }
});

export default router;
