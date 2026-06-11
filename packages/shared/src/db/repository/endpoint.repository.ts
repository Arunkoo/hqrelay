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
    .limit(1);

  return result[0] ?? null;
}
