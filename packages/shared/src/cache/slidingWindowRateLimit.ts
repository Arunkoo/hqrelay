import { client } from "./redis";
import { randomUUID } from "crypto";

/**
 * This function check if current Project is under Limit set for the req or not.
 * @param {string} projectId takes input as projectId,
 * @return {boolean} true if is in Limit otherwise false...
 */

//TODO:  NEED TO REVIEW THIS CODE DOWN AS MAYBE WE HAVE CHANCE TO REFRACTOR IT BUT IN MY CASE IT ALMOST DONE .

export async function isRateLimited(projectId: string): Promise<Boolean> {
  const key = `hqrelay:ratelimit:${projectId}`;
  const score = Date.now();
  const member = randomUUID();
  const cutoff = Date.now() - 60000;

  //remove older enteries...
  await client.zremrangebyscore(key, 0, cutoff);

  //count..
  const count = await client.zcard(key);

  if (count >= 100) return true;

  //add (key, score, member)
  await client.zadd(key, score, member);

  //expire the key..
  await client.expire(key, 60);

  return false;
}
