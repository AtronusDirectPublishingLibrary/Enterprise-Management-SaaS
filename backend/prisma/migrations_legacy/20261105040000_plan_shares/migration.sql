-- AlterTable
ALTER TABLE "HeroText" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "plan_share" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "label" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_viewed_at" TIMESTAMP(3),
    "view_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "plan_share_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_share_comment" (
    "id" TEXT NOT NULL,
    "share_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "author_name" TEXT NOT NULL,
    "author_email" TEXT,
    "body" TEXT NOT NULL,
    "context" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_share_comment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plan_share_token_key" ON "plan_share"("token");

-- CreateIndex
CREATE INDEX "plan_share_plan_id_idx" ON "plan_share"("plan_id");

-- CreateIndex
CREATE INDEX "plan_share_comment_plan_id_is_read_created_at_idx" ON "plan_share_comment"("plan_id", "is_read", "created_at");

-- AddForeignKey
ALTER TABLE "plan_share" ADD CONSTRAINT "plan_share_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_share_comment" ADD CONSTRAINT "plan_share_comment_share_id_fkey" FOREIGN KEY ("share_id") REFERENCES "plan_share"("id") ON DELETE CASCADE ON UPDATE CASCADE;

