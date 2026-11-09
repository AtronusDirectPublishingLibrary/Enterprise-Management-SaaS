-- Dynamic languages, owner progress updates, monthly payslips and staff positions.

ALTER TABLE "users" ADD COLUMN "position" TEXT;

CREATE TABLE "language" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "native_name" TEXT,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "language_pkey" PRIMARY KEY ("code")
);

CREATE TABLE "translation_value" (
    "id" TEXT NOT NULL,
    "translation_id" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "translation_value_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "translation_value_translation_id_lang_key" ON "translation_value"("translation_id", "lang");

ALTER TABLE "translation_value" ADD CONSTRAINT "translation_value_translation_id_fkey"
    FOREIGN KEY ("translation_id") REFERENCES "translation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "translation_value" ADD CONSTRAINT "translation_value_lang_fkey"
    FOREIGN KEY ("lang") REFERENCES "language"("code") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "language" ("code", "name", "native_name", "is_enabled", "sort_order", "updated_at") VALUES
    ('en', 'English', 'English', true, 0, CURRENT_TIMESTAMP),
    ('am', 'Amharic', 'አማርኛ', true, 1, CURRENT_TIMESTAMP),
    ('om', 'Afan Oromo', 'Afaan Oromoo', false, 2, CURRENT_TIMESTAMP),
    ('so', 'Somali', 'Soomaali', false, 3, CURRENT_TIMESTAMP),
    ('ti', 'Tigrinya', 'ትግርኛ', false, 4, CURRENT_TIMESTAMP),
    ('aa', 'Afar', 'Qafar af', false, 5, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

CREATE TABLE "progress_update" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "period_label" TEXT NOT NULL DEFAULT '',
    "author_id" TEXT NOT NULL,
    "author_name" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "summary" TEXT NOT NULL,
    "achievements" TEXT,
    "challenges" TEXT,
    "next_steps" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "reviewer_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "progress_update_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "progress_update_item_id_period_label_key" ON "progress_update"("item_id", "period_label");
CREATE INDEX "progress_update_plan_id_period_label_idx" ON "progress_update"("plan_id", "period_label");
CREATE INDEX "progress_update_author_id_status_idx" ON "progress_update"("author_id", "status");

ALTER TABLE "progress_update" ADD CONSTRAINT "progress_update_plan_id_fkey"
    FOREIGN KEY ("plan_id") REFERENCES "plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "progress_update" ADD CONSTRAINT "progress_update_item_id_fkey"
    FOREIGN KEY ("item_id") REFERENCES "plan_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "payslip" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "base_salary" DOUBLE PRECISION NOT NULL,
    "allowance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gross" DOUBLE PRECISION NOT NULL,
    "pension" DOUBLE PRECISION NOT NULL,
    "tax" DOUBLE PRECISION NOT NULL,
    "other_deductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "net" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ETB',
    "status" TEXT NOT NULL DEFAULT 'Generated',
    "sent_at" TIMESTAMP(3),
    "sent_to" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payslip_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payslip_user_id_year_month_key" ON "payslip"("user_id", "year", "month");
CREATE INDEX "payslip_year_month_idx" ON "payslip"("year", "month");

ALTER TABLE "payslip" ADD CONSTRAINT "payslip_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;