import { client } from "./redis";

export async function isDuplicate(webhookId: string): Promise<boolean> {
  const key = await client.exists(`hqrelay:${webhookId}`);

  return key ? true : false;
}

export async function markAsSeen(webhookId: string): Promise<void> {
  await client.set(`hqrelay:idempotency< ${webhookId} > `, "1", "EX", 86400);
}
