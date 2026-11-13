CREATE TABLE "field_change" (
  "id" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT NOT NULL,
  "field" TEXT NOT NULL,
  "old_value" TEXT,
  "new_value" TEXT,
  "changed_by_id" TEXT,
  "changed_by_name" TEXT,
  "request_id" TEXT,
  "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "field_change_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "field_change_entity_type_entity_id_changed_at_idx" ON "field_change"("entity_type", "entity_id", "changed_at");
CREATE INDEX "field_change_changed_by_id_changed_at_idx" ON "field_change"("changed_by_id", "changed_at");
