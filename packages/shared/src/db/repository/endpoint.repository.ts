import { eq } from "drizzle-orm";
import { db } from "../client";
import { endpoints } from "../schema";

export async function getEndpointAndTargetUrl(
  projectId: string,
): Promise<{ endpoint: string; targetUrl: string } | null> {
  const result = await db
    .select({
      endpoint: endpoints.id,
      targetUrl: endpoints.url,
    })
    .from(endpoints)
    .where(eq(endpoints.project_id, projectId))
    .limit(1); //TODO: CURRENT ASSUMPTION THAT 1 PROPJECT HAVE 1 ENDPOINT

  return result[0] ?? null;
}

/**
 * this function query database and finds secret for projectId
 * on success otherwise throw..
 * @param {string} projectId  pass by client..
 * @returns {string} secret for the projetId if exist
 */

export async function getProjectSecret(
  projectId: string,
): Promise<{ secret: string }> {
  let result;
  try {
    result = await db
      .select({ secret: endpoints.secret })
      .from(endpoints)
      .where(eq(endpoints.project_id, projectId))
      .limit(1); //assuming 1 project have 1 secret only....
  } catch (err) {
    throw new Error("Can't resolved query", { cause: err });
  }

  if (result.length === 0) {
    throw Error("projectId not found");
  }

  return result[0];
}
