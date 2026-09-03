ALTER TABLE "identity"."teacher_profiles" ADD COLUMN "suspended_at" timestamp;--> statement-breakpoint
ALTER TABLE "identity"."teacher_profiles" ADD COLUMN "scheduled_deletion_at" timestamp;