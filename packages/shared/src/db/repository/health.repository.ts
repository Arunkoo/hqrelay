import { sql } from "drizzle-orm";
import { db } from "../client";

/**
 * @description  ping db to know if its healthy or not
 * @returns - Boolean value true or false;
 */

export async function checkDatabaseLiveness(): Promise<boolean> {
  try {
    await db.execute(sql`Select 1`);
    console.log("Db is responsive..");
    return true;
  } catch (error) {
    console.error("DB unresponsive", error);
    return false;
  }
}
