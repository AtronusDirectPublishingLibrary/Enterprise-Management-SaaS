-- Official terminology is Department. Rename in place so existing project and
-- fleet request values are preserved.
ALTER TABLE "Project" RENAME COLUMN "leadDirectorate" TO "leadDepartment";
ALTER TABLE "vehicle_request" RENAME COLUMN "directorate" TO "department";
