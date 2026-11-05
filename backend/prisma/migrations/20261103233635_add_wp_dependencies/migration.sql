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
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

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
CREATE UNIQUE INDEX "DropdownOption_category_value_key" ON "DropdownOption"("category", "value");

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
ALTER TABLE "_MilestoneDependencies" ADD CONSTRAINT "_MilestoneDependencies_A_fkey" FOREIGN KEY ("A") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MilestoneDependencies" ADD CONSTRAINT "_MilestoneDependencies_B_fkey" FOREIGN KEY ("B") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ActivityDependencies" ADD CONSTRAINT "_ActivityDependencies_A_fkey" FOREIGN KEY ("A") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ActivityDependencies" ADD CONSTRAINT "_ActivityDependencies_B_fkey" FOREIGN KEY ("B") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
