-- Employee-filed resignations, tied to the HR notice period.
ALTER TABLE "offboarding_case" ADD COLUMN "resignation_submitted_at" TIMESTAMP(3);
ALTER TABLE "offboarding_case" ADD COLUMN "resignation_note" TEXT;
ALTER TABLE "offboarding_case" ADD COLUMN "notice_period_days" INTEGER;
ALTER TABLE "offboarding_case" ADD COLUMN "accepted_at" TIMESTAMP(3);