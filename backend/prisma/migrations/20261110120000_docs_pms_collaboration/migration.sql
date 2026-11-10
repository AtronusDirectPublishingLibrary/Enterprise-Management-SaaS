-- Document visibility, unique numbering, work-package ownership and
-- supervisor task progress exchange.

ALTER TABLE "WorkPackage"
  ADD COLUMN "owner_username" TEXT,
  ADD COLUMN "owner_name" TEXT;

ALTER TABLE "Document"
  ADD COLUMN "is_public" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "published_at" TIMESTAMP(3);

-- Resolve any legacy duplicates before enforcing uniqueness.
WITH ranked AS (
  SELECT id, doc_number,
         ROW_NUMBER() OVER (PARTITION BY lower(doc_number) ORDER BY upload_date, id) AS rn
  FROM "Document"
  WHERE doc_number IS NOT NULL AND btrim(doc_number) <> ''
)
UPDATE "Document" d
SET doc_number = r.doc_number || '-DUP-' || substr(r.id, 1, 6)
FROM ranked r
WHERE d.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX "Document_doc_number_key" ON "Document"("doc_number");

ALTER TABLE "staff_task"
  ADD COLUMN "assigned_by_id" TEXT,
  ADD COLUMN "assigned_by_name" TEXT,
  ADD COLUMN "progress" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "latest_update" TEXT,
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "staff_task_assigned_by_id_status_idx"
  ON "staff_task"("assigned_by_id", "status");

CREATE TABLE "staff_task_update" (
  "id" TEXT NOT NULL,
  "task_id" TEXT NOT NULL,
  "author_id" TEXT NOT NULL,
  "author_name" TEXT,
  "progress" INTEGER,
  "note" TEXT NOT NULL,
  "status" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "staff_task_update_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "staff_task_update_task_id_created_at_idx"
  ON "staff_task_update"("task_id", "created_at");

ALTER TABLE "staff_task_update"
  ADD CONSTRAINT "staff_task_update_task_id_fkey"
  FOREIGN KEY ("task_id") REFERENCES "staff_task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

WITH ranked AS (
  SELECT id, reference,
         ROW_NUMBER() OVER (PARTITION BY lower(reference) ORDER BY created_at, id) AS rn
  FROM "staff_document"
  WHERE reference IS NOT NULL AND btrim(reference) <> ''
)
UPDATE "staff_document" d
SET reference = r.reference || '-DUP-' || substr(r.id, 1, 6)
FROM ranked r
WHERE d.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX "staff_document_reference_key" ON "staff_document"("reference");

CREATE TABLE "number_sequence" (
  "id" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "value" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "number_sequence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "number_sequence_scope_year_key"
  ON "number_sequence"("scope", "year");