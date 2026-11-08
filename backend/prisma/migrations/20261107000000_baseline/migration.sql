-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sourceOfFunds" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Not Started',
    "priority" TEXT NOT NULL DEFAULT 'Medium',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "dependencies" TEXT,
    "createdDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastModifiedBy" TEXT,
    "lastModifiedDate" TIMESTAMP(3),
    "projectCategory" TEXT,
    "leadDirectorate" TEXT,
    "leadDivision" TEXT,
    "piName" TEXT,
    "piEmail" TEXT,
    "projectManager" TEXT,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkPackage" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "workPackageId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Not Started',
    "createdBy" TEXT NOT NULL,
    "dependencies" TEXT,
    "createdDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastModifiedBy" TEXT,
    "lastModifiedDate" TIMESTAMP(3),

    CONSTRAINT "WorkPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Not Started',
    "createdBy" TEXT NOT NULL,
    "dependencies" TEXT,
    "createdDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastModifiedBy" TEXT,
    "lastModifiedDate" TIMESTAMP(3),

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "workPackageId" TEXT,
    "parentActivityId" TEXT,
    "milestoneId" TEXT,
    "activityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "assignedTo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Not Started',
    "financialPlan" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "actualExpenditure" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "dependencies" TEXT,
    "createdDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastModifiedBy" TEXT,
    "lastModifiedDate" TIMESTAMP(3),

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "associated_grants" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "assigned_directorate" TEXT,
    "assigned_division" TEXT,
    "pi_name" TEXT,
    "co_pi_name" TEXT,
    "email" TEXT,
    "last_login" TIMESTAMP(3),
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "force_change" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" BIGSERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grant_id" TEXT,
    "action" TEXT NOT NULL,
    "user" TEXT NOT NULL,
    "details" JSONB,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "doc_number" TEXT,
    "thematic" TEXT NOT NULL,
    "thematic_other" TEXT,
    "type" TEXT NOT NULL,
    "type_other" TEXT,
    "unit" TEXT,
    "language" TEXT NOT NULL DEFAULT 'English',
    "version" TEXT,
    "first_endorsement" TEXT,
    "recent_renewal" TEXT,
    "expiry" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "notes" TEXT,
    "file_name" TEXT,
    "file_url" TEXT,
    "uploaded_by" TEXT,
    "upload_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "folder_path" TEXT,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HeroImage" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HeroImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HeroText" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "tagline" TEXT,
    "cta_label" TEXT,
    "cta_url" TEXT,
    "image_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HeroText_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DropdownOption" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DropdownOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment" (
    "id" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "authorName" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reaction" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_message" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_brief" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'markdown',
    "updatedBy" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_brief_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_member" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "addedBy" TEXT NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_rule" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "triggerEvent" TEXT NOT NULL,
    "triggerValue" TEXT,
    "actionType" TEXT NOT NULL,
    "actionTarget" TEXT,
    "actionValue" TEXT,
    "createdBy" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'On Track',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_goal" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "project_goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_entry" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "activityId" TEXT,
    "username" TEXT NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "translation" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "en" TEXT NOT NULL,
    "am" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "translation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "title_am" TEXT,
    "content_am" TEXT,
    "imageUrl" TEXT,
    "author" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "news_pkey" PRIMARY KEY ("id")
);

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
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "revision" INTEGER NOT NULL DEFAULT 1,
    "parent_plan_id" TEXT,
    "period_id" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_period" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "label_alt" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'Planned',
    "parent_period_id" TEXT,
    "successor_id" TEXT,
    "prepared_at" TIMESTAMP(3),
    "activated_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_period_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "period_transition" (
    "id" TEXT NOT NULL,
    "period_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor" TEXT NOT NULL DEFAULT 'system',
    "note" TEXT,
    "dedupe_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "period_transition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_item" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "linked_item_id" TEXT,
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
CREATE TABLE "plan_report" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "period_label" TEXT NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "owner" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "submitted_at" TIMESTAMP(3),
    "submitted_by" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_alert" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "item_id" TEXT,
    "report_id" TEXT,
    "dedupe_key" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "plan_revision" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "snapshot" JSONB NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_revision_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "app_setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "VisitorLog" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "visitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitorLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_MilestoneDependencies" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_ActivityDependencies" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_projectId_key" ON "Project"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkPackage_workPackageId_key" ON "WorkPackage"("workPackageId");

-- CreateIndex
CREATE UNIQUE INDEX "Milestone_milestoneId_key" ON "Milestone"("milestoneId");

-- CreateIndex
CREATE UNIQUE INDEX "Activity_activityId_key" ON "Activity"("activityId");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "HeroText_isActive_sort_order_idx" ON "HeroText"("isActive", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "DropdownOption_category_value_key" ON "DropdownOption"("category", "value");

-- CreateIndex
CREATE INDEX "comment_targetType_targetId_idx" ON "comment"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "comment_author_idx" ON "comment"("author");

-- CreateIndex
CREATE UNIQUE INDEX "reaction_commentId_emoji_author_key" ON "reaction"("commentId", "emoji", "author");

-- CreateIndex
CREATE INDEX "project_message_projectId_created_at_idx" ON "project_message"("projectId", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "project_brief_projectId_key" ON "project_brief"("projectId");

-- CreateIndex
CREATE INDEX "project_member_username_idx" ON "project_member"("username");

-- CreateIndex
CREATE UNIQUE INDEX "project_member_projectId_username_key" ON "project_member"("projectId", "username");

-- CreateIndex
CREATE INDEX "notification_recipient_read_created_at_idx" ON "notification"("recipient", "read", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "project_goal_goalId_projectId_key" ON "project_goal"("goalId", "projectId");

-- CreateIndex
CREATE INDEX "time_entry_projectId_username_idx" ON "time_entry"("projectId", "username");

-- CreateIndex
CREATE UNIQUE INDEX "translation_key_key" ON "translation"("key");

-- CreateIndex
CREATE UNIQUE INDEX "plan_period_id_key" ON "plan"("period_id");

-- CreateIndex
CREATE INDEX "plan_type_status_idx" ON "plan"("type", "status");

-- CreateIndex
CREATE INDEX "plan_parent_plan_id_idx" ON "plan"("parent_plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "plan_type_period_label_key" ON "plan"("type", "period_label");

-- CreateIndex
CREATE UNIQUE INDEX "plan_period_successor_id_key" ON "plan_period"("successor_id");

-- CreateIndex
CREATE INDEX "plan_period_type_state_start_date_idx" ON "plan_period"("type", "state", "start_date");

-- CreateIndex
CREATE UNIQUE INDEX "plan_period_type_sequence_key" ON "plan_period"("type", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "plan_period_type_label_key" ON "plan_period"("type", "label");

-- CreateIndex
CREATE UNIQUE INDEX "period_transition_dedupe_key_key" ON "period_transition"("dedupe_key");

-- CreateIndex
CREATE INDEX "period_transition_period_id_created_at_idx" ON "period_transition"("period_id", "created_at");

-- CreateIndex
CREATE INDEX "plan_item_plan_id_parent_id_sort_order_idx" ON "plan_item"("plan_id", "parent_id", "sort_order");

-- CreateIndex
CREATE INDEX "plan_item_linked_item_id_idx" ON "plan_item"("linked_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "plan_kpi_target_item_id_period_label_key" ON "plan_kpi_target"("item_id", "period_label");

-- CreateIndex
CREATE INDEX "plan_report_plan_id_due_date_idx" ON "plan_report"("plan_id", "due_date");

-- CreateIndex
CREATE INDEX "plan_report_status_due_date_idx" ON "plan_report"("status", "due_date");

-- CreateIndex
CREATE UNIQUE INDEX "plan_alert_dedupe_key_key" ON "plan_alert"("dedupe_key");

-- CreateIndex
CREATE INDEX "plan_alert_plan_id_status_created_at_idx" ON "plan_alert"("plan_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "plan_alert_status_created_at_idx" ON "plan_alert"("status", "created_at");

-- CreateIndex
CREATE INDEX "plan_alert_mail_created_at_idx" ON "plan_alert_mail"("created_at");

-- CreateIndex
CREATE INDEX "plan_revision_plan_id_created_at_idx" ON "plan_revision"("plan_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "plan_share_token_key" ON "plan_share"("token");

-- CreateIndex
CREATE INDEX "plan_share_plan_id_idx" ON "plan_share"("plan_id");

-- CreateIndex
CREATE INDEX "plan_share_comment_plan_id_is_read_created_at_idx" ON "plan_share_comment"("plan_id", "is_read", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "_MilestoneDependencies_AB_unique" ON "_MilestoneDependencies"("A", "B");

-- CreateIndex
CREATE INDEX "_MilestoneDependencies_B_index" ON "_MilestoneDependencies"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ActivityDependencies_AB_unique" ON "_ActivityDependencies"("A", "B");

-- CreateIndex
CREATE INDEX "_ActivityDependencies_B_index" ON "_ActivityDependencies"("B");

-- AddForeignKey
ALTER TABLE "WorkPackage" ADD CONSTRAINT "WorkPackage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("projectId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("projectId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("projectId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_workPackageId_fkey" FOREIGN KEY ("workPackageId") REFERENCES "WorkPackage"("workPackageId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_parentActivityId_fkey" FOREIGN KEY ("parentActivityId") REFERENCES "Activity"("activityId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reaction" ADD CONSTRAINT "reaction_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_message" ADD CONSTRAINT "project_message_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("projectId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_brief" ADD CONSTRAINT "project_brief_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("projectId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_member" ADD CONSTRAINT "project_member_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("projectId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_rule" ADD CONSTRAINT "automation_rule_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("projectId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_goal" ADD CONSTRAINT "project_goal_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_goal" ADD CONSTRAINT "project_goal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("projectId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entry" ADD CONSTRAINT "time_entry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("projectId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan" ADD CONSTRAINT "plan_parent_plan_id_fkey" FOREIGN KEY ("parent_plan_id") REFERENCES "plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan" ADD CONSTRAINT "plan_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "plan_period"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_period" ADD CONSTRAINT "plan_period_parent_period_id_fkey" FOREIGN KEY ("parent_period_id") REFERENCES "plan_period"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_period" ADD CONSTRAINT "plan_period_successor_id_fkey" FOREIGN KEY ("successor_id") REFERENCES "plan_period"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "period_transition" ADD CONSTRAINT "period_transition_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "plan_period"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_item" ADD CONSTRAINT "plan_item_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_item" ADD CONSTRAINT "plan_item_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "plan_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_item" ADD CONSTRAINT "plan_item_linked_item_id_fkey" FOREIGN KEY ("linked_item_id") REFERENCES "plan_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_kpi_target" ADD CONSTRAINT "plan_kpi_target_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "plan_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_report" ADD CONSTRAINT "plan_report_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_alert" ADD CONSTRAINT "plan_alert_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_alert" ADD CONSTRAINT "plan_alert_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "plan_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_alert" ADD CONSTRAINT "plan_alert_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "plan_report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_alert_mail" ADD CONSTRAINT "plan_alert_mail_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "plan_alert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_revision" ADD CONSTRAINT "plan_revision_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_share" ADD CONSTRAINT "plan_share_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_share_comment" ADD CONSTRAINT "plan_share_comment_share_id_fkey" FOREIGN KEY ("share_id") REFERENCES "plan_share"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MilestoneDependencies" ADD CONSTRAINT "_MilestoneDependencies_A_fkey" FOREIGN KEY ("A") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MilestoneDependencies" ADD CONSTRAINT "_MilestoneDependencies_B_fkey" FOREIGN KEY ("B") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ActivityDependencies" ADD CONSTRAINT "_ActivityDependencies_A_fkey" FOREIGN KEY ("A") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ActivityDependencies" ADD CONSTRAINT "_ActivityDependencies_B_fkey" FOREIGN KEY ("B") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

