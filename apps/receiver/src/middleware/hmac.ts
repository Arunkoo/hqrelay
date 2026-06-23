import {
  getCachedConfig,
  setProjectConfig,
} from "@hqrelay/shared/src/cache/projectConfig";
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

  let secret: string | null;

  if (configValue) {
    secret = configValue;
    console.log(`[HMAC] cache hit for ${projectId}`);
  } else {
    //db call.
    console.log(`[HMAC] cache miss for ${projectId} — fetching from DB`);
    const sec = process.env.WEBHOOK_SECRET!;
    await setProjectConfig(projectId, sec);

    secret = sec;
  }

  const verify = verifySignature(signature, secret, rawBody);
  if (!verify) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  return next();
}
