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

export const endpoints = pgTable("endpoints", {
  id: uuid().defaultRandom().primaryKey(),
  project_id: uuid()
    .references(() => projects.id)
    .notNull(),
  url: text().notNull(),
  secret: text().notNull(),
  created_at: timestamp().defaultNow(),
});
