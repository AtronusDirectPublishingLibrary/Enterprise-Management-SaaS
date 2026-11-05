import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./lib/auth";
import LandingPage from "./pages/LandingPage";
import PublicLayout from "./layouts/PublicLayout";
import About from "./pages/public/About";
import Products from "./pages/public/Products";
import News from "./pages/public/News";
import Partners from "./pages/public/Partners";
import Investors from "./pages/public/Investors";
import Documents from "./pages/public/Documents";
import Contact from "./pages/public/Contact";
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
import Goals from "./pages/Goals";
import Portfolios from "./pages/Portfolios";
import Users from "./pages/Users";
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ExecutiveDashboard = lazy(() => import("./pages/ExecutiveDashboard"));
const PlansPage = lazy(() => import("./pages/PlansPage"));
const PlanAlertSettings = lazy(() => import("./pages/PlanAlertSettings"));
const SharedPlanPage = lazy(() => import("./pages/SharedPlanPage"));
const PlanPrintPage = lazy(() => import("./pages/PlanPrintPage"));

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="d-flex vh-100 justify-content-center align-items-center"><div className="spinner-border text-success" role="status" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="d-flex vh-100 justify-content-center align-items-center"><div className="spinner-border text-success" role="status" /></div>;
  }

  return (
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
        <Route path="/products" element={<Products />} />
        <Route path="/news" element={<News />} />
        <Route path="/partners" element={<Partners />} />
        <Route path="/investors" element={<Investors />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/contact" element={<Contact />} />
      </Route>

      {/* Restricted, read-only plan shared with a link */}
      <Route path="/share/:token" element={<SharedPlanPage />} />

      {/* Printable board pack */}
      <Route path="/plans/:planId/print" element={<RequireAuth><PlanPrintPage /></RequireAuth>} />

      {/* Auth & Intake */}
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/request" element={<PublicForm />} />
      
      {/* Protected Application Routes */}
      <Route element={<RequireAuth><MainLayout /></RequireAuth>}>
        
        {/* Main Dashboard and Database Wrapper */}
        <Route element={<DatabasePage />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/database/roadmap" element={<PlansPage type="ROADMAP" />} />
          <Route path="/database/strategic-plan" element={<PlansPage type="STRATEGIC" />} />
          <Route path="/database/pms/*" element={<Projects />} />
          <Route path="/database/aop" element={<PlansPage type="AOP" />} />
          <Route path="/database/archive" element={<ArchivePage />} />
          <Route path="/database/hero-settings" element={<HeroSettingsAdmin />} />
        </Route>

        <Route path="/users" element={<Users />} />
        <Route path="/executive" element={<ExecutiveDashboard />} />
        <Route path="/language-settings" element={<LanguageSettings />} />
        <Route path="/plan-alerts" element={<PlanAlertSettings />} />
        <Route path="/manage-news" element={<ManageNews />} />
        <Route path="/manage-documents" element={<ManageDocuments />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/portfolios" element={<Portfolios />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
    </Suspense>
  );
}