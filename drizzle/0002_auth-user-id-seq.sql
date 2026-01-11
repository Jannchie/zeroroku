ALTER TABLE "session" DROP CONSTRAINT "session_user_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "account" DROP CONSTRAINT "account_user_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "id" TYPE bigint USING "id"::bigint;--> statement-breakpoint
CREATE SEQUENCE IF NOT EXISTS "user_id_seq";--> statement-breakpoint
SELECT setval('"user_id_seq"', (SELECT COALESCE(MAX("id"), 0) FROM "user"));--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "id" SET DEFAULT nextval('"user_id_seq"');--> statement-breakpoint
ALTER SEQUENCE "user_id_seq" OWNED BY "user"."id";--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "user_id" TYPE bigint USING "user_id"::bigint;--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "user_id" TYPE bigint USING "user_id"::bigint;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
