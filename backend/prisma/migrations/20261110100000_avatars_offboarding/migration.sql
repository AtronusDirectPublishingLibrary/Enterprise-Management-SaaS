-- Round portrait avatars and typed signature initials on each person's profile.
ALTER TABLE "users" ADD COLUMN "initials_text" TEXT;
ALTER TABLE "users" ADD COLUMN "avatar_url" TEXT;
ALTER TABLE "users" ADD COLUMN "avatar_updated_at" TIMESTAMP(3);

-- Structured exit management from notice through final settlement.
CREATE TABLE "offboarding_case" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "initiated_by_id" TEXT NOT NULL,
    "manager_id" TEXT,
    "reason" TEXT NOT NULL DEFAULT 'RESIGNATION',
    "status" TEXT NOT NULL DEFAULT 'INITIATED',
    "notice_date" TIMESTAMP(3),
    "last_working_day" TIMESTAMP(3) NOT NULL,
    "exit_interview_at" TIMESTAMP(3),
    "exit_interview_notes" TEXT,
    "handover_notes" TEXT,
    "final_settlement_amount" DOUBLE PRECISION,
    "settlement_status" TEXT NOT NULL DEFAULT 'PENDING',
    "eligible_for_rehire" BOOLEAN,
    "employee_acknowledged_at" TIMESTAMP(3),
    "hr_approved_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offboarding_case_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "offboarding_case_user_id_status_idx" ON "offboarding_case"("user_id", "status");
CREATE INDEX "offboarding_case_status_last_working_day_idx" ON "offboarding_case"("status", "last_working_day");

ALTER TABLE "offboarding_case"
  ADD CONSTRAINT "offboarding_case_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "offboarding_case"
  ADD CONSTRAINT "offboarding_case_initiated_by_id_fkey"
  FOREIGN KEY ("initiated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "offboarding_case"
  ADD CONSTRAINT "offboarding_case_manager_id_fkey"
  FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "offboarding_task" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "owner" TEXT NOT NULL DEFAULT 'HR',
    "due_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "completed_by" TEXT,
    "notes" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "offboarding_task_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "offboarding_task_case_id_sort_order_idx" ON "offboarding_task"("case_id", "sort_order");

ALTER TABLE "offboarding_task"
  ADD CONSTRAINT "offboarding_task_case_id_fkey"
  FOREIGN KEY ("case_id") REFERENCES "offboarding_case"("id") ON DELETE CASCADE ON UPDATE CASCADE;