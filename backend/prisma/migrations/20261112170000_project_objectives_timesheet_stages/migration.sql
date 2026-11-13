-- Link a delivery-level project objective to the corporate objective it serves.
ALTER TABLE "goal" ADD COLUMN "plan_item_id" TEXT;

CREATE INDEX "goal_plan_item_id_idx" ON "goal"("plan_item_id");

ALTER TABLE "goal"
  ADD CONSTRAINT "goal_plan_item_id_fkey"
  FOREIGN KEY ("plan_item_id") REFERENCES "plan_item"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Two-stage timesheet route: HR & Admin Manager first, then the supervisor.
ALTER TABLE "Timesheet" ADD COLUMN "hr_reviewed_at" TIMESTAMP(3);
ALTER TABLE "Timesheet" ADD COLUMN "hr_reviewed_by" TEXT;
