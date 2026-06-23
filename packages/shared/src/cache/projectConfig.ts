import { client } from "./redis";

export async function getCachedConfig(
  projectId: string,
): Promise<string | null> {
  const secret = await client.get(`hqrelay:projectConfig:${projectId}`);

  return secret;
}

export async function setProjectConfig(
  projectId: string,
  secret: string,
): Promise<void> {
  await client.set(`hqrelay:projectConfig:${projectId}`, secret, "EX", 300);
}
