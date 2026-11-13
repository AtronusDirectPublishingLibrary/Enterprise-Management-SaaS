-- Link a PMS project to the plan period whose financial targets it delivers.
ALTER TABLE "Project" ADD COLUMN "plan_id" TEXT;

CREATE INDEX "Project_plan_id_idx" ON "Project"("plan_id");

ALTER TABLE "Project"
  ADD CONSTRAINT "Project_plan_id_fkey"
  FOREIGN KEY ("plan_id") REFERENCES "plan"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
