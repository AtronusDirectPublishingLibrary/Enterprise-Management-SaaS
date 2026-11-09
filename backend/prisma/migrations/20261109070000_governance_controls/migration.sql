-- Optional TOTP MFA for privileged accounts.
ALTER TABLE "users" ADD COLUMN "mfa_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "mfa_secret" TEXT;

-- Maker-checker approval on salary changes.
ALTER TABLE "SalaryRecord" ADD COLUMN "approval_status" TEXT NOT NULL DEFAULT 'Approved';
ALTER TABLE "SalaryRecord" ADD COLUMN "submitted_by" TEXT;
ALTER TABLE "SalaryRecord" ADD COLUMN "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "SalaryRecord" ADD COLUMN "approved_by" TEXT;
ALTER TABLE "SalaryRecord" ADD COLUMN "approved_at" TIMESTAMP(3);
ALTER TABLE "SalaryRecord" ADD COLUMN "approval_note" TEXT;
CREATE INDEX "SalaryRecord_approval_status_effective_at_idx" ON "SalaryRecord"("approval_status", "effectiveAt");

-- Bulk-import history and rollback snapshots.
CREATE TABLE "import_batch" (
    "id" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "plan_id" TEXT,
    "user_id" TEXT NOT NULL,
    "user_name" TEXT,
    "file_name" TEXT,
    "summary" JSONB NOT NULL,
    "snapshot" JSONB NOT NULL,
    "rolled_back_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "import_batch_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "import_batch_module_created_at_idx" ON "import_batch"("module", "created_at");
CREATE INDEX "import_batch_plan_id_created_at_idx" ON "import_batch"("plan_id", "created_at");

-- Scheduled consolidated-report distribution.
CREATE TABLE "report_schedule" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "plan_id" TEXT,
    "recipients" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "frequency" TEXT NOT NULL DEFAULT 'MONTHLY',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_run_at" TIMESTAMP(3),
    "next_run_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "report_schedule_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "report_schedule_enabled_next_run_at_idx" ON "report_schedule"("enabled", "next_run_at");
