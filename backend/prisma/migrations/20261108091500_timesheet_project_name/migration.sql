-- Timesheet rows are grouped by the project/workstream name typed by the user,
-- but the column the API writes was never created.
ALTER TABLE "TimesheetEntry" ADD COLUMN "project_name" TEXT;
