ALTER TABLE "users" ADD COLUMN "token_version" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "job_lock" (
  "name" TEXT NOT NULL,
  "locked_by" TEXT,
  "locked_until" TIMESTAMP(3),
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "job_lock_pkey" PRIMARY KEY ("name")
);

CREATE TABLE "audit_checkpoint" (
  "id" TEXT NOT NULL,
  "head_id" BIGINT NOT NULL,
  "head_hash" TEXT NOT NULL,
  "checked_count" INTEGER NOT NULL,
  "previous_hash" TEXT,
  "algorithm" TEXT NOT NULL DEFAULT 'Ed25519',
  "key_id" TEXT NOT NULL,
  "public_key_pem" TEXT NOT NULL,
  "public_key_sha256" TEXT NOT NULL,
  "signature" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_checkpoint_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "audit_checkpoint_created_at_idx" ON "audit_checkpoint"("created_at");
