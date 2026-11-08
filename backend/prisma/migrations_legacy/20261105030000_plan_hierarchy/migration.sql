-- AlterTable
ALTER TABLE "plan" ADD COLUMN     "parent_plan_id" TEXT;

-- AlterTable
ALTER TABLE "plan_item" ADD COLUMN     "linked_item_id" TEXT;

-- CreateIndex
CREATE INDEX "plan_parent_plan_id_idx" ON "plan"("parent_plan_id");

-- CreateIndex
CREATE INDEX "plan_item_linked_item_id_idx" ON "plan_item"("linked_item_id");

-- AddForeignKey
ALTER TABLE "plan" ADD CONSTRAINT "plan_parent_plan_id_fkey" FOREIGN KEY ("parent_plan_id") REFERENCES "plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_item" ADD CONSTRAINT "plan_item_linked_item_id_fkey" FOREIGN KEY ("linked_item_id") REFERENCES "plan_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

