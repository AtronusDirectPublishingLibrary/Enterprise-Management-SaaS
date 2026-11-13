-- Tamper-evident audit foundation.
-- Existing rows are backfilled before the append-only trigger is installed.
ALTER TABLE "audit_log" ADD COLUMN "nonce" TEXT;
ALTER TABLE "audit_log" ADD COLUMN "chain_version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "audit_log" ADD COLUMN "event_hash" TEXT;
ALTER TABLE "audit_log" ADD COLUMN "prev_hash" TEXT;

CREATE UNIQUE INDEX "audit_log_event_hash_key" ON "audit_log"("event_hash");
CREATE UNIQUE INDEX "audit_log_prev_hash_key" ON "audit_log"("prev_hash");

CREATE TABLE "audit_verification" (
  "id" BIGSERIAL NOT NULL,
  "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "checked_by" TEXT NOT NULL,
  "checked_count" INTEGER NOT NULL,
  "valid" BOOLEAN NOT NULL,
  "broken_at" BIGINT,
  "head_hash" TEXT,
  "legacy_count" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "audit_verification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_verification_checked_at_idx" ON "audit_verification"("checked_at");
