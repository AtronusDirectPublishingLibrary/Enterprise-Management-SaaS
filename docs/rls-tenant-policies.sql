-- RLS policies for tenant-scoped tables (generated). REVIEW before applying.
-- Requires app to SET LOCAL app.tenant_id and app.bypass_rls per request/transaction.
-- With Prisma, integrate via $extends/$transaction hooks or connection-level settings.
BEGIN;

-- Project -> Project
ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Project" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Project";
CREATE POLICY tenant_isolation ON "Project" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- WorkPackage -> WorkPackage
ALTER TABLE "WorkPackage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkPackage" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "WorkPackage";
CREATE POLICY tenant_isolation ON "WorkPackage" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- Milestone -> Milestone
ALTER TABLE "Milestone" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Milestone" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Milestone";
CREATE POLICY tenant_isolation ON "Milestone" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- Activity -> Activity
ALTER TABLE "Activity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Activity" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Activity";
CREATE POLICY tenant_isolation ON "Activity" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- User -> users
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "users";
CREATE POLICY tenant_isolation ON "users" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- MfaRecoveryCode -> mfa_recovery_code
ALTER TABLE "mfa_recovery_code" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mfa_recovery_code" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "mfa_recovery_code";
CREATE POLICY tenant_isolation ON "mfa_recovery_code" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- WebAuthnCredential -> webauthn_credential
ALTER TABLE "webauthn_credential" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "webauthn_credential" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "webauthn_credential";
CREATE POLICY tenant_isolation ON "webauthn_credential" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- WebAuthnChallenge -> webauthn_challenge
ALTER TABLE "webauthn_challenge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "webauthn_challenge" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "webauthn_challenge";
CREATE POLICY tenant_isolation ON "webauthn_challenge" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- AuditLog -> audit_log
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_log" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "audit_log";
CREATE POLICY tenant_isolation ON "audit_log" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- AuditVerification -> audit_verification
ALTER TABLE "audit_verification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_verification" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "audit_verification";
CREATE POLICY tenant_isolation ON "audit_verification" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- FieldChange -> field_change
ALTER TABLE "field_change" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "field_change" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "field_change";
CREATE POLICY tenant_isolation ON "field_change" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- AuditCheckpoint -> audit_checkpoint
ALTER TABLE "audit_checkpoint" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_checkpoint" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "audit_checkpoint";
CREATE POLICY tenant_isolation ON "audit_checkpoint" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- Document -> Document
ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Document" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Document";
CREATE POLICY tenant_isolation ON "Document" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- HeroImage -> HeroImage
ALTER TABLE "HeroImage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HeroImage" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "HeroImage";
CREATE POLICY tenant_isolation ON "HeroImage" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- HeroText -> HeroText
ALTER TABLE "HeroText" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HeroText" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "HeroText";
CREATE POLICY tenant_isolation ON "HeroText" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- DropdownOption -> DropdownOption
ALTER TABLE "DropdownOption" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DropdownOption" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "DropdownOption";
CREATE POLICY tenant_isolation ON "DropdownOption" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- Comment -> comment
ALTER TABLE "comment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "comment" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "comment";
CREATE POLICY tenant_isolation ON "comment" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- Reaction -> reaction
ALTER TABLE "reaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reaction" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "reaction";
CREATE POLICY tenant_isolation ON "reaction" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- ProjectMessage -> project_message
ALTER TABLE "project_message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project_message" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "project_message";
CREATE POLICY tenant_isolation ON "project_message" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- ProjectBrief -> project_brief
ALTER TABLE "project_brief" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project_brief" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "project_brief";
CREATE POLICY tenant_isolation ON "project_brief" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- ProjectMember -> project_member
ALTER TABLE "project_member" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project_member" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "project_member";
CREATE POLICY tenant_isolation ON "project_member" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- Notification -> notification
ALTER TABLE "notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notification" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "notification";
CREATE POLICY tenant_isolation ON "notification" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- AutomationRule -> automation_rule
ALTER TABLE "automation_rule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "automation_rule" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "automation_rule";
CREATE POLICY tenant_isolation ON "automation_rule" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- Goal -> goal
ALTER TABLE "goal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "goal" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "goal";
CREATE POLICY tenant_isolation ON "goal" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- ProjectGoal -> project_goal
ALTER TABLE "project_goal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project_goal" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "project_goal";
CREATE POLICY tenant_isolation ON "project_goal" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- TimeEntry -> time_entry
ALTER TABLE "time_entry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "time_entry" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "time_entry";
CREATE POLICY tenant_isolation ON "time_entry" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- Translation -> translation
ALTER TABLE "translation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "translation" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "translation";
CREATE POLICY tenant_isolation ON "translation" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- Language -> language
ALTER TABLE "language" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "language" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "language";
CREATE POLICY tenant_isolation ON "language" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- TranslationValue -> translation_value
ALTER TABLE "translation_value" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "translation_value" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "translation_value";
CREATE POLICY tenant_isolation ON "translation_value" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- News -> news
ALTER TABLE "news" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "news" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "news";
CREATE POLICY tenant_isolation ON "news" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- Plan -> plan
ALTER TABLE "plan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plan" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "plan";
CREATE POLICY tenant_isolation ON "plan" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- PlanPeriod -> plan_period
ALTER TABLE "plan_period" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plan_period" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "plan_period";
CREATE POLICY tenant_isolation ON "plan_period" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- PeriodTransition -> period_transition
ALTER TABLE "period_transition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "period_transition" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "period_transition";
CREATE POLICY tenant_isolation ON "period_transition" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- PlanItem -> plan_item
ALTER TABLE "plan_item" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plan_item" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "plan_item";
CREATE POLICY tenant_isolation ON "plan_item" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- PlanKpiTarget -> plan_kpi_target
ALTER TABLE "plan_kpi_target" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plan_kpi_target" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "plan_kpi_target";
CREATE POLICY tenant_isolation ON "plan_kpi_target" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- ProgressUpdate -> progress_update
ALTER TABLE "progress_update" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "progress_update" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "progress_update";
CREATE POLICY tenant_isolation ON "progress_update" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- PlanReport -> plan_report
ALTER TABLE "plan_report" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plan_report" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "plan_report";
CREATE POLICY tenant_isolation ON "plan_report" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- PlanAlert -> plan_alert
ALTER TABLE "plan_alert" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plan_alert" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "plan_alert";
CREATE POLICY tenant_isolation ON "plan_alert" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- PlanAlertMail -> plan_alert_mail
ALTER TABLE "plan_alert_mail" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plan_alert_mail" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "plan_alert_mail";
CREATE POLICY tenant_isolation ON "plan_alert_mail" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- PlanRevision -> plan_revision
ALTER TABLE "plan_revision" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plan_revision" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "plan_revision";
CREATE POLICY tenant_isolation ON "plan_revision" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- PlanShare -> plan_share
ALTER TABLE "plan_share" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plan_share" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "plan_share";
CREATE POLICY tenant_isolation ON "plan_share" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- PlanShareComment -> plan_share_comment
ALTER TABLE "plan_share_comment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plan_share_comment" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "plan_share_comment";
CREATE POLICY tenant_isolation ON "plan_share_comment" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- AppSetting -> app_setting
ALTER TABLE "app_setting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app_setting" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "app_setting";
CREATE POLICY tenant_isolation ON "app_setting" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- VisitorLog -> visitor_log
ALTER TABLE "visitor_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "visitor_log" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "visitor_log";
CREATE POLICY tenant_isolation ON "visitor_log" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- MediaVideo -> media_video
ALTER TABLE "media_video" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "media_video" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "media_video";
CREATE POLICY tenant_isolation ON "media_video" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- Training -> training
ALTER TABLE "training" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "training" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "training";
CREATE POLICY tenant_isolation ON "training" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- LeaveRequest -> leave_request
ALTER TABLE "leave_request" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "leave_request" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "leave_request";
CREATE POLICY tenant_isolation ON "leave_request" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- AttendanceLog -> attendance_log
ALTER TABLE "attendance_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attendance_log" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "attendance_log";
CREATE POLICY tenant_isolation ON "attendance_log" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- LeaveType -> leave_type
ALTER TABLE "leave_type" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "leave_type" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "leave_type";
CREATE POLICY tenant_isolation ON "leave_type" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- LeaveBalance -> leave_balance
ALTER TABLE "leave_balance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "leave_balance" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "leave_balance";
CREATE POLICY tenant_isolation ON "leave_balance" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- AnnualLeavePlan -> annual_leave_plan
ALTER TABLE "annual_leave_plan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "annual_leave_plan" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "annual_leave_plan";
CREATE POLICY tenant_isolation ON "annual_leave_plan" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- AnnualLeavePlanItem -> annual_leave_plan_item
ALTER TABLE "annual_leave_plan_item" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "annual_leave_plan_item" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "annual_leave_plan_item";
CREATE POLICY tenant_isolation ON "annual_leave_plan_item" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- PublicHoliday -> public_holiday
ALTER TABLE "public_holiday" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public_holiday" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "public_holiday";
CREATE POLICY tenant_isolation ON "public_holiday" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- Timesheet -> timesheet
ALTER TABLE "timesheet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "timesheet" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "timesheet";
CREATE POLICY tenant_isolation ON "timesheet" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- TimesheetEntry -> timesheet_entry
ALTER TABLE "timesheet_entry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "timesheet_entry" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "timesheet_entry";
CREATE POLICY tenant_isolation ON "timesheet_entry" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- TimesheetSetting -> timesheet_setting
ALTER TABLE "timesheet_setting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "timesheet_setting" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "timesheet_setting";
CREATE POLICY tenant_isolation ON "timesheet_setting" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- JobPosting -> job_posting
ALTER TABLE "job_posting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "job_posting" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "job_posting";
CREATE POLICY tenant_isolation ON "job_posting" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- Applicant -> applicant
ALTER TABLE "applicant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "applicant" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "applicant";
CREATE POLICY tenant_isolation ON "applicant" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- Payslip -> payslip
ALTER TABLE "payslip" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payslip" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "payslip";
CREATE POLICY tenant_isolation ON "payslip" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- SalaryRecord -> salary_record
ALTER TABLE "salary_record" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "salary_record" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "salary_record";
CREATE POLICY tenant_isolation ON "salary_record" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- ImportBatch -> import_batch
ALTER TABLE "import_batch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "import_batch" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "import_batch";
CREATE POLICY tenant_isolation ON "import_batch" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- ReportSchedule -> report_schedule
ALTER TABLE "report_schedule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "report_schedule" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "report_schedule";
CREATE POLICY tenant_isolation ON "report_schedule" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- StaffTask -> staff_task
ALTER TABLE "staff_task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "staff_task" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "staff_task";
CREATE POLICY tenant_isolation ON "staff_task" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- StaffTaskUpdate -> staff_task_update
ALTER TABLE "staff_task_update" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "staff_task_update" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "staff_task_update";
CREATE POLICY tenant_isolation ON "staff_task_update" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- StaffDocument -> staff_document
ALTER TABLE "staff_document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "staff_document" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "staff_document";
CREATE POLICY tenant_isolation ON "staff_document" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- NumberSequence -> number_sequence
ALTER TABLE "number_sequence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "number_sequence" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "number_sequence";
CREATE POLICY tenant_isolation ON "number_sequence" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- Induction -> induction
ALTER TABLE "induction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "induction" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "induction";
CREATE POLICY tenant_isolation ON "induction" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- InductionTask -> induction_task
ALTER TABLE "induction_task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "induction_task" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "induction_task";
CREATE POLICY tenant_isolation ON "induction_task" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- RecruitmentRequest -> recruitment_request
ALTER TABLE "recruitment_request" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "recruitment_request" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "recruitment_request";
CREATE POLICY tenant_isolation ON "recruitment_request" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- JobDescription -> job_description
ALTER TABLE "job_description" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "job_description" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "job_description";
CREATE POLICY tenant_isolation ON "job_description" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- JobDescriptionAssignment -> job_description_assignment
ALTER TABLE "job_description_assignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "job_description_assignment" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "job_description_assignment";
CREATE POLICY tenant_isolation ON "job_description_assignment" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- SignatureRecord -> signature_record
ALTER TABLE "signature_record" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "signature_record" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "signature_record";
CREATE POLICY tenant_isolation ON "signature_record" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- OffboardingCase -> offboarding_case
ALTER TABLE "offboarding_case" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "offboarding_case" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "offboarding_case";
CREATE POLICY tenant_isolation ON "offboarding_case" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- OffboardingTask -> offboarding_task
ALTER TABLE "offboarding_task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "offboarding_task" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "offboarding_task";
CREATE POLICY tenant_isolation ON "offboarding_task" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- Appraisal -> appraisal
ALTER TABLE "appraisal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "appraisal" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "appraisal";
CREATE POLICY tenant_isolation ON "appraisal" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- AppraisalItem -> appraisal_item
ALTER TABLE "appraisal_item" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "appraisal_item" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "appraisal_item";
CREATE POLICY tenant_isolation ON "appraisal_item" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- AppraisalCriterion -> appraisal_criterion
ALTER TABLE "appraisal_criterion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "appraisal_criterion" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "appraisal_criterion";
CREATE POLICY tenant_isolation ON "appraisal_criterion" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- Vehicle -> vehicle
ALTER TABLE "vehicle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vehicle" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "vehicle";
CREATE POLICY tenant_isolation ON "vehicle" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- Driver -> driver
ALTER TABLE "driver" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "driver" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "driver";
CREATE POLICY tenant_isolation ON "driver" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- VehicleRequest -> vehicle_request
ALTER TABLE "vehicle_request" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vehicle_request" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "vehicle_request";
CREATE POLICY tenant_isolation ON "vehicle_request" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- RideProvider -> ride_provider
ALTER TABLE "ride_provider" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ride_provider" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "ride_provider";
CREATE POLICY tenant_isolation ON "ride_provider" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- RideRequest -> ride_request
ALTER TABLE "ride_request" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ride_request" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "ride_request";
CREATE POLICY tenant_isolation ON "ride_request" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- FleetSetting -> fleet_setting
ALTER TABLE "fleet_setting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "fleet_setting" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "fleet_setting";
CREATE POLICY tenant_isolation ON "fleet_setting" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- FuelLog -> fleet_fuel_log
ALTER TABLE "fleet_fuel_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "fleet_fuel_log" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "fleet_fuel_log";
CREATE POLICY tenant_isolation ON "fleet_fuel_log" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- MaintenanceRecord -> fleet_maintenance
ALTER TABLE "fleet_maintenance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "fleet_maintenance" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "fleet_maintenance";
CREATE POLICY tenant_isolation ON "fleet_maintenance" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- SparePartRecord -> fleet_spare_part
ALTER TABLE "fleet_spare_part" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "fleet_spare_part" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "fleet_spare_part";
CREATE POLICY tenant_isolation ON "fleet_spare_part" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- TyreRecord -> fleet_tyre
ALTER TABLE "fleet_tyre" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "fleet_tyre" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "fleet_tyre";
CREATE POLICY tenant_isolation ON "fleet_tyre" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- SocialPost -> social_post
ALTER TABLE "social_post" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "social_post" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "social_post";
CREATE POLICY tenant_isolation ON "social_post" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- QmsDocument -> qms_document
ALTER TABLE "qms_document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "qms_document" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "qms_document";
CREATE POLICY tenant_isolation ON "qms_document" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- QmsDeviation -> qms_deviation
ALTER TABLE "qms_deviation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "qms_deviation" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "qms_deviation";
CREATE POLICY tenant_isolation ON "qms_deviation" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- QmsCapa -> qms_capa
ALTER TABLE "qms_capa" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "qms_capa" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "qms_capa";
CREATE POLICY tenant_isolation ON "qms_capa" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- QmsChangeControl -> qms_change_control
ALTER TABLE "qms_change_control" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "qms_change_control" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "qms_change_control";
CREATE POLICY tenant_isolation ON "qms_change_control" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- TenantSetting -> tenant_setting
ALTER TABLE "tenant_setting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_setting" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "tenant_setting";
CREATE POLICY tenant_isolation ON "tenant_setting" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- CustomFieldDefinition -> custom_field_definition
ALTER TABLE "custom_field_definition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "custom_field_definition" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "custom_field_definition";
CREATE POLICY tenant_isolation ON "custom_field_definition" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- CustomFieldValue -> custom_field_value
ALTER TABLE "custom_field_value" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "custom_field_value" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "custom_field_value";
CREATE POLICY tenant_isolation ON "custom_field_value" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

-- Invoice -> invoice
ALTER TABLE "invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invoice" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "invoice";
CREATE POLICY tenant_isolation ON "invoice" USING (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true)) WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenant_id"::text = current_setting('app.tenant_id', true));

COMMIT;
