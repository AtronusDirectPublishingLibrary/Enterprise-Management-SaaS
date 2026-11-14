-- BATCH S2: Multi-tenant migration (single transaction)
-- Strategy: create SaaS tables, add tenant_id columns, seed default tenant/plan,
-- backfill all rows, enforce NOT NULL/FKs/indexes. Existing rows preserved.

BEGIN;

-- 1) SaaS core tables
CREATE TABLE IF NOT EXISTS "subscription_plan" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "price_monthly" DOUBLE PRECISION NOT NULL,
  "price_yearly" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "trial_days" INTEGER NOT NULL DEFAULT 14,
  "enabled_modules" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "max_users" INTEGER NOT NULL DEFAULT 10,
  "max_storage_gb" INTEGER NOT NULL DEFAULT 5,
  "for_non_profit" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "stripe_price_id_monthly" TEXT,
  "stripe_price_id_yearly" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subscription_plan_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "subscription_plan_code_key" ON "subscription_plan"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "subscription_plan_stripe_price_id_monthly_key" ON "subscription_plan"("stripe_price_id_monthly");
CREATE UNIQUE INDEX IF NOT EXISTS "subscription_plan_stripe_price_id_yearly_key" ON "subscription_plan"("stripe_price_id_yearly");

CREATE TABLE IF NOT EXISTS "tenant" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'PROFIT',
  "legal_name" TEXT,
  "tax_id" TEXT,
  "country" TEXT DEFAULT 'ET',
  "timezone" TEXT NOT NULL DEFAULT 'Africa/Addis_Ababa',
  "primary_email" TEXT NOT NULL,
  "primary_phone" TEXT,
  "status" TEXT NOT NULL DEFAULT 'TRIAL',
  "trial_ends_at" TIMESTAMP(3),
  "stripe_customer_id" TEXT,
  "stripe_subscription_id" TEXT,
  "onboarding_complete" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "subscription_plan_id" TEXT,
  CONSTRAINT "tenant_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "tenant_slug_key" ON "tenant"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "tenant_stripe_customer_id_key" ON "tenant"("stripe_customer_id");
CREATE UNIQUE INDEX IF NOT EXISTS "tenant_stripe_subscription_id_key" ON "tenant"("stripe_subscription_id");

CREATE TABLE IF NOT EXISTS "tenant_setting" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updated_by" TEXT,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tenant_setting_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "tenant_setting_tenant_id_key_key" ON "tenant_setting"("tenant_id","key");

CREATE TABLE IF NOT EXISTS "custom_field_definition" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "field_key" TEXT NOT NULL,
  "field_label" TEXT NOT NULL,
  "field_label_am" TEXT,
  "field_type" TEXT NOT NULL,
  "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "required" BOOLEAN NOT NULL DEFAULT false,
  "placeholder" TEXT,
  "help_text" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "custom_field_definition_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "custom_field_definition_tenant_id_entity_type_field_key_key" ON "custom_field_definition"("tenant_id","entity_type","field_key");
CREATE INDEX IF NOT EXISTS "custom_field_definition_tenant_id_entity_type_is_active_sort_order_idx" ON "custom_field_definition"("tenant_id","entity_type","is_active","sort_order");

CREATE TABLE IF NOT EXISTS "custom_field_value" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "definition_id" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT NOT NULL,
  "value" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "custom_field_value_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "custom_field_value_definition_id_entity_id_key" ON "custom_field_value"("definition_id","entity_id");
CREATE INDEX IF NOT EXISTS "custom_field_value_tenant_id_entity_type_entity_id_idx" ON "custom_field_value"("tenant_id","entity_type","entity_id");

CREATE TABLE IF NOT EXISTS "invoice" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "stripe_invoice_id" TEXT NOT NULL,
  "amount_due" DOUBLE PRECISION NOT NULL,
  "amount_paid" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "status" TEXT NOT NULL,
  "period_start" TIMESTAMP(3) NOT NULL,
  "period_end" TIMESTAMP(3) NOT NULL,
  "invoice_pdf_url" TEXT,
  "paid_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "invoice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "invoice_stripe_invoice_id_key" ON "invoice"("stripe_invoice_id");
CREATE INDEX IF NOT EXISTS "invoice_tenant_id_status_idx" ON "invoice"("tenant_id","status");

-- 2) Default plan and tenant
INSERT INTO "subscription_plan" ("id","code","name","description","price_monthly","price_yearly","currency","trial_days","enabled_modules","max_users","max_storage_gb","for_non_profit","is_active","updated_at")
VALUES ('plan_default_enterprise','ENTERPRISE','Enterprise','Default migrated plan (all modules)',299,2990,'USD',14,
  ARRAY['pms','aop','strategic','roadmap','hr','recruitment','payroll','fleet','qms','planning','reports','projects','public_site']::TEXT[],
  100000,10000,false,true,CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "tenant" ("id","slug","name","type","legal_name","country","timezone","primary_email","status","onboarding_complete","subscription_plan_id","updated_at")
VALUES ('tenant_default_ethio_biopharma','ethio-biopharma','Ethio-Biopharma','NON_PROFIT','Ethio-Biopharma','ET','Africa/Addis_Ababa','admin@ethiobiopharma.local','ACTIVE',true,'plan_default_enterprise',CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

-- 3) Add tenant_id to existing tables (nullable first), backfill, then enforce NOT NULL
DO $$
DECLARE r RECORD;
DECLARE default_tenant TEXT := 'tenant_default_ethio_biopharma';
DECLARE skip_tables TEXT[] := ARRAY['_prisma_migrations','tenant','subscription_plan','tenant_setting','custom_field_definition','custom_field_value','invoice','_ActivityDependencies','_MilestoneDependencies'];
DECLARE nullable_tables TEXT[] := ARRAY['audit_log','audit_checkpoint','audit_verification','job_lock','app_setting'];
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> ALL(skip_tables)
  LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tenant_id TEXT', r.tablename);

    IF r.tablename = 'audit_log' THEN
      -- audit_log is append-only/immutable by trigger; allow a one-time controlled backfill.
      EXECUTE 'ALTER TABLE audit_log DISABLE TRIGGER audit_immutable';
      EXECUTE format('UPDATE %I SET tenant_id = %L WHERE tenant_id IS NULL', r.tablename, default_tenant);
      EXECUTE 'ALTER TABLE audit_log ENABLE TRIGGER audit_immutable';
    ELSE
      EXECUTE format('UPDATE %I SET tenant_id = %L WHERE tenant_id IS NULL', r.tablename, default_tenant);
    END IF;

    IF NOT (r.tablename = ANY(nullable_tables)) THEN
      EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id SET NOT NULL', r.tablename);
    END IF;

    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (tenant_id)', r.tablename || '_tenant_id_idx', r.tablename);
  END LOOP;
END $$;

-- 4) FK for tenant plan and for key tables (best-effort; skip if exists semantics via exception-safe blocks not needed here)
ALTER TABLE "tenant" DROP CONSTRAINT IF EXISTS "tenant_subscription_plan_id_fkey";
ALTER TABLE "tenant" ADD CONSTRAINT "tenant_subscription_plan_id_fkey" FOREIGN KEY ("subscription_plan_id") REFERENCES "subscription_plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tenant_setting" DROP CONSTRAINT IF EXISTS "tenant_setting_tenant_id_fkey";
ALTER TABLE "tenant_setting" ADD CONSTRAINT "tenant_setting_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "custom_field_definition" DROP CONSTRAINT IF EXISTS "custom_field_definition_tenant_id_fkey";
ALTER TABLE "custom_field_definition" ADD CONSTRAINT "custom_field_definition_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "custom_field_value" DROP CONSTRAINT IF EXISTS "custom_field_value_definition_id_fkey";
ALTER TABLE "custom_field_value" ADD CONSTRAINT "custom_field_value_definition_id_fkey" FOREIGN KEY ("definition_id") REFERENCES "custom_field_definition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- User tenant FK and make required (already set NOT NULL in loop)
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_tenant_id_fkey";
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
