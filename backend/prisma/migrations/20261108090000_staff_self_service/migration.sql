-- Staff self-service: profile dates, personal tasks and HR documents with expiry.
ALTER TABLE "users" ADD COLUMN "employee_no" TEXT;
ALTER TABLE "users" ADD COLUMN "job_title" TEXT;
ALTER TABLE "users" ADD COLUMN "phone" TEXT;
ALTER TABLE "users" ADD COLUMN "hire_date" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "probation_end" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "contract_end" TIMESTAMP(3);

CREATE UNIQUE INDEX "users_employee_no_key" ON "users"("employee_no");

CREATE TABLE "staff_task" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "due_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "link" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "staff_task_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "staff_document" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "reference" TEXT,
    "issued_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "file_url" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_document_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "staff_task_user_id_status_due_at_idx" ON "staff_task"("user_id", "status", "due_at");
CREATE INDEX "staff_document_user_id_expires_at_idx" ON "staff_document"("user_id", "expires_at");

ALTER TABLE "staff_task" ADD CONSTRAINT "staff_task_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "staff_document" ADD CONSTRAINT "staff_document_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
