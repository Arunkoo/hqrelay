CREATE TYPE "public"."log_status" AS ENUM('duplicate', 'queued', 'failed');--> statement-breakpoint
CREATE TABLE "webhook_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"webhook_id" text NOT NULL,
	"correlation_id" text NOT NULL,
	"status" "log_status" NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "delivery_attempts" ALTER COLUMN "status" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;