import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import "@fontsource-variable/inter";
import "@fontsource-variable/noto-sans-ethiopic";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/fraunces/wght-italic.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/theme.css";
import "./styles/public.css";
import "./styles/hr.css";
import "./styles/app.css";
import "./styles/fleet.css";
import "./styles/executive-bi.css";
import "./styles/news-social.css";
import "./styles/qms.css";
import App from "./App";
import { AuthProvider } from "./lib/auth";
import { NotificationProvider } from "./lib/notifications";
import { LanguageProvider } from "./lib/language";
import { ThemeProvider } from "./lib/theme";
import { ErrorBoundary } from "./components/ErrorBoundary";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <BrowserRouter>
          <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <NotificationProvider>
                <App />
              </NotificationProvider>
            </AuthProvider>
          </LanguageProvider>
          </ThemeProvider>
        </BrowserRouter>
      </HelmetProvider>
    </ErrorBoundary>
  </React.StrictMode>
);