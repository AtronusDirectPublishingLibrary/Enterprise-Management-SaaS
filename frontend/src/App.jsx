import MyHRPortal from "./pages/MyHRPortal";
import MyApprovals from "./pages/MyApprovals";
import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./lib/auth";
import { canAccess, isSystemAdmin } from "./lib/access";
import AuditLog from "./pages/AuditLog";
import Payroll from "./pages/Payroll";
import Recruitment from "./pages/Recruitment";
import HrOperations from "./pages/HrOperations";
import HRAnalytics from "./pages/HRAnalytics";
import HRDashboard from "./pages/HRDashboard";
import HomePage from "./pages/HomePage";
import AccountSecurity from "./pages/AccountSecurity";
import FlyInObserver from "./components/FlyInObserver";
import LandingPage from "./pages/LandingPage";
import Careers from "./pages/Careers";
import PublicLayout from "./layouts/PublicLayout";
import About from "./pages/public/About";
import AboutMission from "./pages/public/AboutMission";
import AboutObjectives from "./pages/public/AboutObjectives";
import AboutBoard from "./pages/public/AboutBoard";
import Products from "./pages/public/Products";
import News from "./pages/public/News";
import Partners from "./pages/public/Partners";
import Investors from "./pages/public/Investors";
import Documents from "./pages/public/Documents";
import Contact from "./pages/public/Contact";
import PrintTimesheet from "./pages/PrintTimesheet";
import Login from "./pages/Login";
import PublicForm from "./pages/PublicForm";
import MainLayout from "./layouts/MainLayout";
import DatabasePage from "./pages/DatabasePage";
import Projects from "./pages/Projects";
import ArchivePage from "./pages/ArchivePage";
import HeroSettingsAdmin from "./pages/HeroSettingsAdmin";

import LanguageSettings from "./pages/LanguageSettings";
import ManageNews from "./pages/ManageNews";
import ManageDocuments from "./pages/ManageDocuments";
import ManageMedia from "./pages/ManageMedia";
import PublicSiteSettings from "./pages/PublicSiteSettings";
import Goals from "./pages/Goals";
import Portfolios from "./pages/Portfolios";
import PmsProjectGoals from "./pages/PmsProjectGoals";
import PmsPortfolio from "./pages/PmsPortfolio";
import Users from "./pages/Users";
import ProgressUpdates from "./pages/ProgressUpdates";
import TeamTasks from "./pages/TeamTasks";
import ConsolidatedReports from "./pages/ConsolidatedReports";
import PayslipPage from "./pages/PayslipPage";
import FleetDashboard from "./pages/fleet/FleetDashboard";
import FleetRequests from "./pages/fleet/FleetRequests";
import NewFleetRequest from "./pages/fleet/NewFleetRequest";
import FleetApprovals from "./pages/fleet/FleetApprovals";
import FleetVehicles from "./pages/fleet/FleetVehicles";
import FleetDrivers from "./pages/fleet/FleetDrivers";
import RideServices from "./pages/fleet/RideServices";
import FleetSettings from "./pages/fleet/FleetSettings";
import FleetAnalytics from "./pages/fleet/FleetAnalytics";
import FleetCostControl from "./pages/fleet/FleetCostControl";
import GatePassVerifyPage from "./pages/fleet/GatePassVerifyPage";
import GatePassPage from "./pages/fleet/GatePassPage";
import QmsDocuments from "./pages/qms/QmsDocuments";
import QmsDocumentEditor from "./pages/qms/QmsDocumentEditor";
import QmsOverview from "./pages/qms/QmsOverview";
import QmsDeviations from "./pages/qms/QmsDeviations";
import QmsCapa from "./pages/qms/QmsCapa";
import QmsChanges from "./pages/qms/QmsChanges";
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ExecutiveDashboard = lazy(() => import("./pages/ExecutiveDashboard"));
const PlansPage = lazy(() => import("./pages/PlansPage"));
const PlanAlertSettings = lazy(() => import("./pages/PlanAlertSettings"));
const PlanningPeriods = lazy(() => import("./pages/PlanningPeriods"));
const SharedPlanPage = lazy(() => import("./pages/SharedPlanPage"));
const PlanPrintPage = lazy(() => import("./pages/PlanPrintPage"));

function RoleRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="d-flex vh-100 justify-content-center align-items-center"><div className="spinner-border text-primary" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isSystemAdmin(user) && !allowedRoles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="d-flex vh-100 justify-content-center align-items-center"><div className="spinner-border text-success" role="status" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AccessRoute({ children, accessKey }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="d-flex vh-100 justify-content-center align-items-center"><div className="spinner-border text-primary" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!canAccess(user, accessKey)) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="d-flex vh-100 justify-content-center align-items-center"><div className="spinner-border text-success" role="status" /></div>;
  }

  return (
      <>
        <FlyInObserver />
    <Suspense
      fallback={
        <div className="d-flex vh-100 justify-content-center align-items-center">
          <div className="spinner-border text-success" role="status" />
        </div>
      }
    >
    <Routes>
      {/* Public Corporate Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/about" element={<About />} />
        <Route path="/about/mission" element={<AboutMission />} />
        <Route path="/about/objectives" element={<AboutObjectives />} />
        <Route path="/about/board" element={<AboutBoard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/news" element={<News />} />
        <Route path="/partners" element={<Partners />} />
        <Route path="/investors" element={<Investors />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/careers" element={<Careers />} />
        <Route path="/careers/:id" element={<Careers />} />
        <Route path="/contact" element={<Contact />} />
      </Route>

      {/* Restricted, read-only plan shared with a link */}
      <Route path="/share/:token" element={<SharedPlanPage />} />

      {/* Printable board pack */}
      <Route path="/plans/:planId/print" element={<RequireAuth><PlanPrintPage /></RequireAuth>} />

      {/* Branded payslip, printable / save as PDF */}
      <Route path="/payslips/:id" element={<RequireAuth><PayslipPage /></RequireAuth>} />

      {/* Auth & Intake */}
      <Route path="/print-timesheet/:id" element={<PrintTimesheet />} />
        <Route path="/login" element={user ? <Navigate to={user.mfaEnrollmentRequired ? "/account-security" : "/dashboard"} replace /> : <Login />} />
      <Route path="/fleet/gate-pass/:requestId/verify" element={<GatePassVerifyPage />} />
      <Route path="/request" element={<PublicForm />} />
      
      {/* Protected Application Routes */}
      <Route element={<RequireAuth><MainLayout /></RequireAuth>}>
        
        {/* Main Dashboard and Database Wrapper */}
        <Route element={<DatabasePage />}>
          <Route path="/dashboard" element={<HomePage />} />
        <Route path="/account-security" element={<AccountSecurity />} />
          <Route path="/pms-dashboard" element={<Dashboard />} />
        <Route path="/pms/goals" element={<PmsProjectGoals />} />
        <Route path="/pms/portfolio" element={<PmsPortfolio />} />
        <Route path="/my-hr" element={<MyHRPortal />} />
        <Route path="/my-approvals" element={<MyApprovals />} />
        <Route path="/team-tasks" element={<TeamTasks />} />
          <Route path="/database/roadmap" element={<PlansPage type="ROADMAP" />} />
          <Route path="/database/strategic-plan" element={<PlansPage type="STRATEGIC" />} />
          <Route path="/database/pms/*" element={<Projects />} />
          <Route path="/database/aop" element={<PlansPage type="AOP" />} />
          <Route path="/database/archive" element={<ArchivePage />} />
          <Route path="/database/hero-settings" element={<HeroSettingsAdmin />} />
        </Route>

        <Route path="/users" element={<RoleRoute allowedRoles={["admin"]}><Users /></RoleRoute>} />
        <Route path="/audit-log" element={<AccessRoute accessKey="audit"><AuditLog /></AccessRoute>} />
        <Route path="/payroll" element={<Payroll />} />
        <Route path="/fleet" element={<FleetDashboard />} />
        <Route path="/fleet/gate-pass/:requestId" element={<GatePassPage />} />
        <Route path="/fleet/requests" element={<FleetRequests />} />
        <Route path="/fleet/new" element={<NewFleetRequest />} />
        <Route path="/fleet/approvals" element={<FleetApprovals />} />
        <Route path="/fleet/vehicles" element={<FleetVehicles />} />
        <Route path="/fleet/drivers" element={<FleetDrivers />} />
        <Route path="/fleet/rides" element={<RideServices />} />
        <Route path="/fleet/settings" element={<FleetSettings />} />
        <Route path="/fleet/analytics" element={<FleetAnalytics />} />
        <Route path="/fleet/cost-control" element={<FleetCostControl />} />
        <Route path="/qms" element={<Navigate to="/qms/overview" replace />} />
        <Route path="/qms/overview" element={<QmsOverview />} />
        <Route path="/qms/documents" element={<QmsDocuments />} />
        <Route path="/qms/documents/new" element={<QmsDocumentEditor />} />
        <Route path="/qms/documents/:id" element={<QmsDocumentEditor />} />
        <Route path="/qms/deviations" element={<QmsDeviations />} />
        <Route path="/qms/capa" element={<QmsCapa />} />
        <Route path="/qms/changes" element={<QmsChanges />} />
        <Route path="/recruitment" element={<RoleRoute allowedRoles={["admin", "executive"]}><Recruitment /></RoleRoute>} />
        <Route path="/hr-operations" element={<RoleRoute allowedRoles={["admin", "executive"]}><HrOperations /></RoleRoute>} />
        <Route path="/hr-analytics" element={<RoleRoute allowedRoles={["admin", "executive"]}><HRAnalytics /></RoleRoute>} />
        <Route path="/hr" element={<RoleRoute allowedRoles={["admin", "executive"]}><HRDashboard /></RoleRoute>} />
        <Route path="/executive" element={<RoleRoute allowedRoles={["admin", "executive"]}><ExecutiveDashboard /></RoleRoute>} />
        <Route path="/language-settings" element={<LanguageSettings />} />
        <Route path="/plan-alerts" element={<PlanAlertSettings />} />
        <Route path="/planning-calendar" element={<PlanningPeriods />} />
        <Route path="/manage-news" element={<ManageNews />} />
        <Route path="/manage-documents" element={<ManageDocuments />} />
        <Route path="/manage-media" element={<ManageMedia />} />
        <Route path="/public-site" element={<RoleRoute allowedRoles={["admin"]}><PublicSiteSettings /></RoleRoute>} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/progress-updates" element={<ProgressUpdates />} />
        <Route path="/reports" element={<ConsolidatedReports />} />
        <Route path="/portfolios" element={<RoleRoute allowedRoles={["admin", "executive", "project_manager"]}><Portfolios /></RoleRoute>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
    </Suspense>
    </>
  );
}