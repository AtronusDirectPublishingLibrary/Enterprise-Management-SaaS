-- Link every progress update to its plan period and give it a stable report index.
ALTER TABLE "progress_update" ADD COLUMN "reference" TEXT;
ALTER TABLE "progress_update" ADD COLUMN "period_id" TEXT;

UPDATE "progress_update" pu
SET "period_id" = p."period_id"
FROM "plan" p
WHERE pu."plan_id" = p."id" AND p."period_id" IS NOT NULL;

WITH numbered AS (
    SELECT "id", ROW_NUMBER() OVER (ORDER BY "created_at", "id") AS rn
    FROM "progress_update"
)
UPDATE "progress_update" pu
SET "reference" = 'PU-' || LPAD(numbered.rn::text, 4, '0')
FROM numbered
WHERE pu."id" = numbered."id";

CREATE UNIQUE INDEX "progress_update_reference_key" ON "progress_update"("reference");
CREATE INDEX "progress_update_period_id_status_idx" ON "progress_update"("period_id", "status");

ALTER TABLE "progress_update" ADD CONSTRAINT "progress_update_period_id_fkey"
    FOREIGN KEY ("period_id") REFERENCES "plan_period"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Monthly payroll inputs can carry occasional earnings and deductions.
ALTER TABLE "SalaryRecord" ADD COLUMN "otherEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "SalaryRecord" ADD COLUMN "otherDeductions" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "payslip" ADD COLUMN "other_earnings" DOUBLE PRECISION NOT NULL DEFAULT 0;
