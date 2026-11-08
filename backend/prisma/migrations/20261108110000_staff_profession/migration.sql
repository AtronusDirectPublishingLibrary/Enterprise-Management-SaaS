-- Profession-aware self-service: which renewal obligations apply to a person.
ALTER TABLE "users" ADD COLUMN "profession" TEXT;
ALTER TABLE "users" ADD COLUMN "requires_licence" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "profile_completed_at" TIMESTAMP(3);
