import { client } from "./redis";

export async function getCachedConfig(
  projectId: string,
): Promise<string | null> {
  const secret = await client.get(`hqrelay:projectConfig:${projectId}`);

  return secret;
}
