-- Project documents: each PMS project can own a set of documents.
ALTER TABLE "Document" ADD COLUMN "project_id" TEXT;

CREATE INDEX "Document_project_id_upload_date_idx" ON "Document"("project_id", "upload_date");

ALTER TABLE "Document"
  ADD CONSTRAINT "Document_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "Project"("projectId")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Employment type on staff records (Regular, Contract, Part-time, Other).
ALTER TABLE "users" ADD COLUMN "employment_type" TEXT;

-- Two-letter timesheet abbreviations for leave types.
ALTER TABLE "LeaveType" ADD COLUMN "short_code" TEXT;
CREATE UNIQUE INDEX "LeaveType_short_code_key" ON "LeaveType"("short_code");

-- Absence codes on timesheet day entries (hours stay 0 for an absence).
ALTER TABLE "TimesheetEntry" ADD COLUMN "leave_code" TEXT;

-- Optional video link on news articles.
ALTER TABLE "news" ADD COLUMN "video_url" TEXT;
