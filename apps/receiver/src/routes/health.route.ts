import { Request, Response, Router } from "express";

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

router.get("/health", (req: Request, res: Response) => {
  return res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

export default router;
