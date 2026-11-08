-- Recruitment: richer vacancies and a full applicant pipeline.
ALTER TABLE "JobPosting" ADD COLUMN "summary" TEXT;
ALTER TABLE "JobPosting" ADD COLUMN "requirements" TEXT;
ALTER TABLE "JobPosting" ADD COLUMN "responsibilities" TEXT;
ALTER TABLE "JobPosting" ADD COLUMN "location" TEXT DEFAULT 'Kilinto, Addis Ababa';
ALTER TABLE "JobPosting" ADD COLUMN "employmentType" TEXT DEFAULT 'FULL_TIME';
ALTER TABLE "JobPosting" ADD COLUMN "openings" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "JobPosting" ADD COLUMN "closesAt" TIMESTAMP(3);
ALTER TABLE "JobPosting" ADD COLUMN "publishedAt" TIMESTAMP(3);
ALTER TABLE "JobPosting" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

ALTER TABLE "Applicant" ADD COLUMN "rating" INTEGER;
ALTER TABLE "Applicant" ADD COLUMN "coverLetter" TEXT;
ALTER TABLE "Applicant" ADD COLUMN "resumeUrl" TEXT;
ALTER TABLE "Applicant" ADD COLUMN "interviewAt" TIMESTAMP(3);
ALTER TABLE "Applicant" ADD COLUMN "rejectionReason" TEXT;
ALTER TABLE "Applicant" ADD COLUMN "hiredAt" TIMESTAMP(3);
ALTER TABLE "Applicant" ADD COLUMN "user_id" TEXT;
ALTER TABLE "Applicant" ADD COLUMN "stage_updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Induction checklists for new joiners.
CREATE TABLE "induction" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "induction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "induction_user_id_idx" ON "induction"("user_id");

CREATE TABLE "induction_task" (
    "id" TEXT NOT NULL,
    "induction_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "due_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "notes" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "induction_task_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "induction" ADD CONSTRAINT "induction_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "induction_task" ADD CONSTRAINT "induction_task_induction_id_fkey" FOREIGN KEY ("induction_id") REFERENCES "induction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Performance management: two appraisal cycles per fiscal year.
CREATE TABLE "appraisal" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "cycle" TEXT NOT NULL,
    "period_label" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "self_summary" TEXT,
    "manager_summary" TEXT,
    "self_rating" DOUBLE PRECISION,
    "manager_rating" DOUBLE PRECISION,
    "submitted_at" TIMESTAMP(3),
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "appraisal_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "appraisal_user_id_cycle_key" ON "appraisal"("user_id", "cycle");

CREATE TABLE "appraisal_item" (
    "id" TEXT NOT NULL,
    "appraisal_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 20,
    "self_score" DOUBLE PRECISION,
    "manager_score" DOUBLE PRECISION,
    "comment" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "appraisal_item_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "appraisal" ADD CONSTRAINT "appraisal_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "appraisal_item" ADD CONSTRAINT "appraisal_item_appraisal_id_fkey" FOREIGN KEY ("appraisal_id") REFERENCES "appraisal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
