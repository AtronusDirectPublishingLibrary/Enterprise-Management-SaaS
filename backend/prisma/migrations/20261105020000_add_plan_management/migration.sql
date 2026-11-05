-- CreateTable
CREATE TABLE "plan" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "period_label" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "summary" TEXT,
    "vision" TEXT,
    "mission" TEXT,
    "owner" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_item" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "kind" TEXT NOT NULL,
    "code" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "owner" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "unit" TEXT,
    "baseline" DOUBLE PRECISION,
    "target_value" DOUBLE PRECISION,
    "current_value" DOUBLE PRECISION,
    "direction" TEXT,
    "frequency" TEXT,
    "data_source" TEXT,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "budget" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'Planned',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_kpi_target" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "period_label" TEXT NOT NULL,
    "target" DOUBLE PRECISION,
    "target_label" TEXT,
    "actual" DOUBLE PRECISION,
    "note" TEXT,

    CONSTRAINT "plan_kpi_target_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_alert" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "period_label" TEXT NOT NULL DEFAULT '',
    "severity" TEXT NOT NULL,
    "rule" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "expected" DOUBLE PRECISION,
    "actual" DOUBLE PRECISION,
    "progress" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'Open',
    "emails_sent" INTEGER NOT NULL DEFAULT 0,
    "acknowledged_by" TEXT,
    "acknowledged_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_alert_mail" (
    "id" TEXT NOT NULL,
    "alert_id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_alert_mail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plan_type_status_idx" ON "plan"("type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "plan_type_period_label_key" ON "plan"("type", "period_label");

-- CreateIndex
CREATE INDEX "plan_item_plan_id_parent_id_sort_order_idx" ON "plan_item"("plan_id", "parent_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "plan_kpi_target_item_id_period_label_key" ON "plan_kpi_target"("item_id", "period_label");

-- CreateIndex
CREATE INDEX "plan_alert_plan_id_status_created_at_idx" ON "plan_alert"("plan_id", "status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "plan_alert_item_id_period_label_rule_key" ON "plan_alert"("item_id", "period_label", "rule");

-- CreateIndex
CREATE INDEX "plan_alert_mail_created_at_idx" ON "plan_alert_mail"("created_at");

-- AddForeignKey
ALTER TABLE "plan_item" ADD CONSTRAINT "plan_item_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_item" ADD CONSTRAINT "plan_item_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "plan_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_kpi_target" ADD CONSTRAINT "plan_kpi_target_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "plan_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_alert" ADD CONSTRAINT "plan_alert_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_alert" ADD CONSTRAINT "plan_alert_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "plan_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_alert_mail" ADD CONSTRAINT "plan_alert_mail_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "plan_alert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

