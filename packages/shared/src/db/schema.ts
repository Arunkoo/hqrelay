import {
  integer,
  json,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const projects = pgTable("projects", {
  id: uuid().defaultRandom().primaryKey(),
  name: text().notNull(),
  api_key: text().unique().notNull(),
  created_at: timestamp().defaultNow(),
});
