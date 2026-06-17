import {
  integer,
  json,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const status = pgEnum("status", [
  "delivered",
  "failed",
  "dead_lettered",
]);

export const log_status = pgEnum("log_status", [
  "duplicate",
  "queued",
  "failed",
]);

export const projects = pgTable("projects", {
  id: uuid().defaultRandom().primaryKey(),
  name: text().notNull(),
  api_key: text().unique().notNull(),
  created_at: timestamp().defaultNow(),
});

export const endpoints = pgTable("endpoints", {
  id: uuid().defaultRandom().primaryKey(),
  project_id: uuid()
    .references(() => projects.id, { onDelete: "restrict" })
    .notNull(),
  url: text().notNull(),
  secret: text().notNull(),
  created_at: timestamp().defaultNow(),
});

export const delivery_attempts = pgTable("delivery_attempts", {
  id: uuid().defaultRandom().primaryKey(),
  project_id: uuid()
    .references(() => projects.id, { onDelete: "restrict" })
    .notNull(),
  endpoint_id: uuid()
    .references(() => endpoints.id, { onDelete: "restrict" })
    .notNull(),
  payload: json().notNull(),
  status_code: integer(),
  status: status().notNull(),
  attempt_num: integer().default(1),
  correlation_id: text().notNull(),
  latency_ms: integer(),
  attempted_at: timestamp().defaultNow(),
});

export const webhook_logs = pgTable("webhook_logs", {
  id: uuid().defaultRandom().primaryKey(),
  // RESTRICT: audit trail — a project's queueing history must never be
  // silently wiped just because the project itself gets deleted
  project_id: uuid()
    .references(() => projects.id, { onDelete: "restrict" })
    .notNull(),
  webhook_id: text().notNull(),
  correlation_id: text().notNull(),
  status: log_status().notNull(),
  created_at: timestamp().defaultNow(),
});
