import { client } from "./redis";

export async function isDuplicate(webhookId: string): Promise<boolean> {
  const key = await client.exists(`hqrelay:${webhookId}`);

  return key ? true : false;
}
