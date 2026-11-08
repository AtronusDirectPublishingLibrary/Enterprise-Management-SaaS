-- Bilingual news: the CMS form and the public news page already read these
-- fields, but the columns were never created, so every save failed.
ALTER TABLE "news" ADD COLUMN "title_am" TEXT;
ALTER TABLE "news" ADD COLUMN "content_am" TEXT;

-- A planning period is now a record of its own instead of being implied by a
-- free-text label on a plan, so the next period can be created, activated and
-- closed without human bookkeeping.
CREATE TABLE "plan_period" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "label_alt" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'Planned',
    "parent_period_id" TEXT,
    "successor_id" TEXT,
    "prepared_at" TIMESTAMP(3),
    "activated_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_period_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "period_transition" (
    "id" TEXT NOT NULL,
    "period_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor" TEXT NOT NULL DEFAULT 'system',
    "note" TEXT,
    "dedupe_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "period_transition_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "plan" ADD COLUMN "period_id" TEXT;

CREATE UNIQUE INDEX "plan_period_type_sequence_key" ON "plan_period"("type", "sequence");
CREATE UNIQUE INDEX "plan_period_type_label_key" ON "plan_period"("type", "label");
CREATE UNIQUE INDEX "plan_period_successor_id_key" ON "plan_period"("successor_id");
CREATE INDEX "plan_period_type_state_start_date_idx" ON "plan_period"("type", "state", "start_date");
CREATE UNIQUE INDEX "plan_period_id_key" ON "plan"("period_id");
CREATE UNIQUE INDEX "period_transition_dedupe_key_key" ON "period_transition"("dedupe_key");
CREATE INDEX "period_transition_period_id_created_at_idx" ON "period_transition"("period_id", "created_at");

ALTER TABLE "plan_period" ADD CONSTRAINT "plan_period_parent_period_id_fkey"
    FOREIGN KEY ("parent_period_id") REFERENCES "plan_period"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "plan_period" ADD CONSTRAINT "plan_period_successor_id_fkey"
    FOREIGN KEY ("successor_id") REFERENCES "plan_period"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "plan" ADD CONSTRAINT "plan_period_id_fkey"
    FOREIGN KEY ("period_id") REFERENCES "plan_period"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "period_transition" ADD CONSTRAINT "period_transition_period_id_fkey"
    FOREIGN KEY ("period_id") REFERENCES "plan_period"("id") ON DELETE CASCADE ON UPDATE CASCADE;
