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
  const signature = req.headers["x-webhook-signature"] as string;

  if (!signature) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const rawBody = (req as any).rawBody;
  if (rawBody === undefined) {
    return res.status(400).json({ message: "Bad Request" });
  }

  const projectId = req.params.projectId as string;
  if (!projectId) {
    return res.status(400).json({ message: "Bad Request" });
  }

  const configValue = await getCachedConfig(projectId);

  let secretVal: string;

  if (configValue) {
    secretVal = configValue;
    console.log(`[HMAC] cache hit for ${projectId}`);
  } else {
    //db call.
    console.log(`[HMAC] cache miss for ${projectId} — fetching from DB`);
    try {
      const { secret } = await getProjectSecret(projectId);
      secretVal = secret;
    } catch (error) {
      if (error instanceof Error && error.message === "projectId not found") {
        return res.status(401).json({
          message: "Unauthorized request",
        });
      } else {
        console.error("[HMAC] DB error fetching secret:", error);
        return res.status(500).json({
          message: "Server error",
        });
      }
    }

    await setProjectConfig(projectId, secretVal);
  }

  const verify = verifySignature(signature, secretVal, rawBody);
  if (!verify) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  return next();
}
