-- CreateTable
CREATE TABLE "media_video" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "title_am" TEXT,
    "caption" TEXT,
    "caption_am" TEXT,
    "video_url" TEXT NOT NULL,
    "poster_url" TEXT,
    "captions_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_video_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "media_video_is_active_sort_order_idx" ON "media_video"("is_active", "sort_order");
