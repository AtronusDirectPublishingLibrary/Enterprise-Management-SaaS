-- AlterTable
ALTER TABLE "plan" ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "approved_by" TEXT,
ADD COLUMN     "published_at" TIMESTAMP(3),
ADD COLUMN     "reviewed_at" TIMESTAMP(3),
ADD COLUMN     "reviewed_by" TEXT,
ADD COLUMN     "revision" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "plan_revision" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "snapshot" JSONB NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_revision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plan_revision_plan_id_created_at_idx" ON "plan_revision"("plan_id", "created_at");

-- AddForeignKey
ALTER TABLE "plan_revision" ADD CONSTRAINT "plan_revision_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

