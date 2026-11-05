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
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ArchivePage from "./pages/ArchivePage";
import HeroSettingsAdmin from "./pages/HeroSettingsAdmin";
import ExecutiveDashboard from "./pages/ExecutiveDashboard";
import LanguageSettings from "./pages/LanguageSettings";
import ManageNews from "./pages/ManageNews";
import ManageDocuments from "./pages/ManageDocuments";
import Goals from "./pages/Goals";
import Portfolios from "./pages/Portfolios";
import Users from "./pages/Users";

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="d-flex vh-100 justify-content-center align-items-center"><div className="spinner-border text-success" role="status" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function Placeholder({ title }) {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center h-100 text-muted">
      <h2 style={{ color: "var(--brand-primary)", fontWeight: 700 }}>{title}</h2>
      <p>This module is currently under development.</p>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="d-flex vh-100 justify-content-center align-items-center"><div className="spinner-border text-success" role="status" /></div>;
  }

  return (
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

      {/* Auth & Intake */}
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/request" element={<PublicForm />} />
      
      {/* Protected Application Routes */}
      <Route element={<RequireAuth><MainLayout /></RequireAuth>}>
        
        {/* Main Dashboard and Database Wrapper */}
        <Route element={<DatabasePage />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/database/roadmap" element={<Placeholder title="Roadmap" />} />
          <Route path="/database/strategic-plan" element={<Placeholder title="Strategic Plan" />} />
          <Route path="/database/pms/*" element={<Projects />} />
          <Route path="/database/aop" element={<Placeholder title="Annual Operational Plan" />} />
          <Route path="/database/archive" element={<ArchivePage />} />`n          <Route path="/database/hero-settings" element={<HeroSettingsAdmin />} />
        </Route>

        <Route path="/users" element={<Users />} />
        <Route path="/executive" element={<ExecutiveDashboard />} />
        <Route path="/language-settings" element={<LanguageSettings />} />
        <Route path="/manage-news" element={<ManageNews />} />
        <Route path="/manage-documents" element={<ManageDocuments />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/portfolios" element={<Portfolios />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}