-- Optional e-signature assets on each person's profile.
ALTER TABLE "users" ADD COLUMN "signature_url" TEXT;
ALTER TABLE "users" ADD COLUMN "initials_url" TEXT;
ALTER TABLE "users" ADD COLUMN "signature_updated_at" TIMESTAMP(3);

-- Recruitment requisitions raised by departments and decided by HR.
CREATE TABLE "recruitment_request" (
    "id" TEXT NOT NULL,
    "request_number" TEXT NOT NULL,
    "requested_by_id" TEXT NOT NULL,
    "position_title" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "employment_type" TEXT NOT NULL DEFAULT 'FULL_TIME',
    "positions" INTEGER NOT NULL DEFAULT 1,
    "reason" TEXT NOT NULL DEFAULT 'NEW',
    "grade" TEXT,
    "budget_status" TEXT NOT NULL DEFAULT 'BUDGETED',
    "target_start_date" TIMESTAMP(3),
    "justification" TEXT,
    "requirements" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "approver_id" TEXT,
    "decided_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "job_posting_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recruitment_request_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "recruitment_request_request_number_key" ON "recruitment_request"("request_number");
CREATE UNIQUE INDEX "recruitment_request_job_posting_id_key" ON "recruitment_request"("job_posting_id");
CREATE INDEX "recruitment_request_status_created_at_idx" ON "recruitment_request"("status", "created_at");

ALTER TABLE "recruitment_request"
  ADD CONSTRAINT "recruitment_request_requested_by_id_fkey"
  FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recruitment_request"
  ADD CONSTRAINT "recruitment_request_approver_id_fkey"
  FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "recruitment_request"
  ADD CONSTRAINT "recruitment_request_job_posting_id_fkey"
  FOREIGN KEY ("job_posting_id") REFERENCES "JobPosting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Job descriptions uploaded by HR and assigned to specific employees.
CREATE TABLE "job_description" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "department" TEXT,
    "position" TEXT,
    "summary" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "effective_date" TIMESTAMP(3),
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL DEFAULT 0,
    "mime_type" TEXT NOT NULL DEFAULT 'application/pdf',
    "uploaded_by_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_description_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "job_description_status_created_at_idx" ON "job_description"("status", "created_at");

ALTER TABLE "job_description"
  ADD CONSTRAINT "job_description_uploaded_by_id_fkey"
  FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "job_description_assignment" (
    "id" TEXT NOT NULL,
    "job_description_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "assigned_by_id" TEXT,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewed_at" TIMESTAMP(3),
    "acknowledged_at" TIMESTAMP(3),

    CONSTRAINT "job_description_assignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "job_description_assignment_job_description_id_user_id_key"
  ON "job_description_assignment"("job_description_id", "user_id");
CREATE INDEX "job_description_assignment_user_id_acknowledged_at_idx"
  ON "job_description_assignment"("user_id", "acknowledged_at");

ALTER TABLE "job_description_assignment"
  ADD CONSTRAINT "job_description_assignment_job_description_id_fkey"
  FOREIGN KEY ("job_description_id") REFERENCES "job_description"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "job_description_assignment"
  ADD CONSTRAINT "job_description_assignment_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "job_description_assignment"
  ADD CONSTRAINT "job_description_assignment_assigned_by_id_fkey"
  FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Immutable signature evidence for forms and approvals.
CREATE TABLE "signature_record" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "signed_name" TEXT NOT NULL,
    "signature_url" TEXT,
    "initials_url" TEXT,
    "note" TEXT,
    "signed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signature_record_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "signature_record_entity_type_entity_id_idx" ON "signature_record"("entity_type", "entity_id");
CREATE INDEX "signature_record_user_id_signed_at_idx" ON "signature_record"("user_id", "signed_at");

ALTER TABLE "signature_record"
  ADD CONSTRAINT "signature_record_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
