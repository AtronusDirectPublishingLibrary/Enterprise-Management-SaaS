-- AlterTable
ALTER TABLE "HeroText" ADD COLUMN     "cta_label" TEXT,
ADD COLUMN     "cta_url" TEXT,
ADD COLUMN     "image_url" TEXT,
ADD COLUMN     "sort_order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tagline" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "HeroText_isActive_sort_order_idx" ON "HeroText"("isActive", "sort_order");

