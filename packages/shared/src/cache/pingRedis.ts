import { withTimeout } from "../helper/withTimeout";
import { client } from "./redis";

export async function checkRedisLiveness(): Promise<boolean> {
  try {
    await withTimeout(client.ping(), 2000);
    return true;
  } catch (error) {
    console.error("Redis is unhealthy", error);
    return false;
  }
}
