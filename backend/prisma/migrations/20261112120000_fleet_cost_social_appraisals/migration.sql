-- AlterTable
ALTER TABLE "Training" ADD COLUMN     "category" TEXT,
ADD COLUMN     "hours" DOUBLE PRECISION,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "result" TEXT;

-- AlterTable
ALTER TABLE "appraisal_item" ADD COLUMN     "category" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "max_score" DOUBLE PRECISION NOT NULL DEFAULT 5;

-- AlterTable
ALTER TABLE "news" ADD COLUMN     "auto_share" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "social_caption" TEXT;

-- CreateTable
CREATE TABLE "appraisal_criterion" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT DEFAULT 'Core',
    "weight" INTEGER NOT NULL DEFAULT 20,
    "max_score" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "guidance" TEXT,
    "applies_to_department" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appraisal_criterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_fuel_log" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "driver_id" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "odometer" DOUBLE PRECISION,
    "litres" DOUBLE PRECISION NOT NULL,
    "unit_cost" DOUBLE PRECISION NOT NULL,
    "total_cost" DOUBLE PRECISION NOT NULL,
    "fuel_type" TEXT,
    "station" TEXT,
    "reference" TEXT,
    "receipt_url" TEXT,
    "notes" TEXT,
    "recorded_by_id" TEXT,
    "recorded_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fleet_fuel_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_maintenance" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Scheduled',
    "status" TEXT NOT NULL DEFAULT 'Scheduled',
    "scheduled_date" TIMESTAMP(3),
    "completed_date" TIMESTAMP(3),
    "odometer" DOUBLE PRECISION,
    "vendor" TEXT,
    "labor_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "parts_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "invoice_no" TEXT,
    "next_service_date" TIMESTAMP(3),
    "next_service_odometer" DOUBLE PRECISION,
    "notes" TEXT,
    "recorded_by_id" TEXT,
    "recorded_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fleet_maintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_spare_part" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "part_name" TEXT NOT NULL,
    "part_number" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unit_cost" DOUBLE PRECISION NOT NULL,
    "total_cost" DOUBLE PRECISION NOT NULL,
    "supplier" TEXT,
    "odometer" DOUBLE PRECISION,
    "maintenance_id" TEXT,
    "notes" TEXT,
    "recorded_by_id" TEXT,
    "recorded_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fleet_spare_part_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fleet_tyre" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "position" TEXT NOT NULL,
    "brand" TEXT,
    "size" TEXT,
    "serial_number" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unit_cost" DOUBLE PRECISION NOT NULL,
    "total_cost" DOUBLE PRECISION NOT NULL,
    "odometer" DOUBLE PRECISION,
    "action" TEXT NOT NULL DEFAULT 'Fitted',
    "notes" TEXT,
    "recorded_by_id" TEXT,
    "recorded_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fleet_tyre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_post" (
    "id" TEXT NOT NULL,
    "news_id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "caption" TEXT,
    "external_id" TEXT,
    "external_url" TEXT,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "scheduled_for" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_post_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "appraisal_criterion_is_active_sort_order_idx" ON "appraisal_criterion"("is_active", "sort_order");

-- CreateIndex
CREATE INDEX "fleet_fuel_log_vehicle_id_date_idx" ON "fleet_fuel_log"("vehicle_id", "date");

-- CreateIndex
CREATE INDEX "fleet_fuel_log_date_idx" ON "fleet_fuel_log"("date");

-- CreateIndex
CREATE INDEX "fleet_maintenance_vehicle_id_scheduled_date_idx" ON "fleet_maintenance"("vehicle_id", "scheduled_date");

-- CreateIndex
CREATE INDEX "fleet_maintenance_status_scheduled_date_idx" ON "fleet_maintenance"("status", "scheduled_date");

-- CreateIndex
CREATE INDEX "fleet_spare_part_vehicle_id_date_idx" ON "fleet_spare_part"("vehicle_id", "date");

-- CreateIndex
CREATE INDEX "fleet_tyre_vehicle_id_date_idx" ON "fleet_tyre"("vehicle_id", "date");

-- CreateIndex
CREATE INDEX "fleet_tyre_position_idx" ON "fleet_tyre"("position");

-- CreateIndex
CREATE INDEX "social_post_status_scheduled_for_idx" ON "social_post"("status", "scheduled_for");

-- CreateIndex
CREATE UNIQUE INDEX "social_post_news_id_channel_key" ON "social_post"("news_id", "channel");

-- CreateIndex
CREATE INDEX "Training_userId_completedAt_idx" ON "Training"("userId", "completedAt");

-- AddForeignKey
ALTER TABLE "fleet_fuel_log" ADD CONSTRAINT "fleet_fuel_log_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_fuel_log" ADD CONSTRAINT "fleet_fuel_log_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_maintenance" ADD CONSTRAINT "fleet_maintenance_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_spare_part" ADD CONSTRAINT "fleet_spare_part_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_tyre" ADD CONSTRAINT "fleet_tyre_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_post" ADD CONSTRAINT "social_post_news_id_fkey" FOREIGN KEY ("news_id") REFERENCES "news"("id") ON DELETE CASCADE ON UPDATE CASCADE;
