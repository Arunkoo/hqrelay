import {
  getCachedConfig,
  setProjectConfig,
} from "@hqrelay/shared/src/cache/projectConfig";
import { getProjectSecret } from "@hqrelay/shared/src/db/repository/endpoint.repository";
import { createHmac } from "crypto";
import { Request, Response, NextFunction } from "express";

function verifySignature(
  signature: string,
  secret: string,
  rawBody: string,
): boolean {
  const expectedSignature = createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  return signature === expectedSignature;
}

export async function hmacRequestValidator(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const projectId = req.params.projectId as string;

  if (projectId) {
    req.logger = req.logger?.child({ projectId: projectId });
  }

  const signature = req.headers["x-webhook-signature"] as string;

  if (!signature) {
    req.logger?.warn("Unauthorized");
    return res.status(401).json({ message: "Unauthorized" });
  }

  const rawBody = (req as any).rawBody;
  if (rawBody === undefined) {
    req.logger?.error("Bad Request");
    return res.status(400).json({ message: "Bad Request" });
  }

  if (!projectId) {
    req.logger?.warn("Bad Request");
    return res.status(400).json({ message: "Bad Request" });
  }

  const configValue = await getCachedConfig(projectId);

  let secretVal: string;

  if (configValue) {
    secretVal = configValue;
    req.logger?.debug("Cache hit");
  } else {
    //db call.
    req.logger?.debug("Cache miss");

    try {
      const { secret } = await getProjectSecret(projectId);
      secretVal = secret;
    } catch (error) {
      if (error instanceof Error && error.message === "projectId not found") {
        req.logger?.warn({ err: error }, "Unauthorized request");
        return res.status(401).json({
          message: "Unauthorized request",
        });
      } else {
        req.logger?.error({ err: error }, "DB error fetching secret");
        return res.status(500).json({
          message: "Server error",
        });
      }
    }

    await setProjectConfig(projectId, secretVal);
  }

  const verify = verifySignature(signature, secretVal, rawBody);
  if (!verify) {
    req.logger?.warn("Unauthorized");
    return res.status(401).json({ message: "Unauthorized" });
  }
  return next();
}
