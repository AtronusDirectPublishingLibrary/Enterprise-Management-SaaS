-- DropIndex
DROP INDEX "plan_alert_item_id_period_label_rule_key";

-- AlterTable
ALTER TABLE "plan_alert" ADD COLUMN     "dedupe_key" TEXT NOT NULL,
ADD COLUMN     "report_id" TEXT,
ALTER COLUMN "item_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "plan_report" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "period_label" TEXT NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "owner" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "submitted_at" TIMESTAMP(3),
    "submitted_by" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plan_report_plan_id_due_date_idx" ON "plan_report"("plan_id", "due_date");

-- CreateIndex
CREATE INDEX "plan_report_status_due_date_idx" ON "plan_report"("status", "due_date");

-- CreateIndex
CREATE UNIQUE INDEX "plan_alert_dedupe_key_key" ON "plan_alert"("dedupe_key");

-- CreateIndex
CREATE INDEX "plan_alert_status_created_at_idx" ON "plan_alert"("status", "created_at");

-- AddForeignKey
ALTER TABLE "plan_report" ADD CONSTRAINT "plan_report_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_alert" ADD CONSTRAINT "plan_alert_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "plan_report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

