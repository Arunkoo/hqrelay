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

export function hmacRequestValidator(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const signature = req.headers["x-webhook-signature"] as string;

  if (!signature) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const rawBody = req.rawBody as string;
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    return res.status(500).json({ message: "server error" });
  }

  const verify = verifySignature(signature, secret, rawBody);
  if (!verify) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  return next();
}
