import { sql } from "drizzle-orm";
import { db } from "../client";
import { withTimeout } from "../../helper/withTimeout";

/**
 * @description  ping db to know if its healthy or not
 * @returns - Boolean value true or false;
 */

export async function checkDatabaseLiveness(): Promise<boolean> {
  try {
    await withTimeout(db.execute(sql`Select 1`), 2000);
    console.log("Db is responsive..");
    return true;
  } catch (error) {
    console.error("DB unresponsive", error);
    return false;
  }
}
