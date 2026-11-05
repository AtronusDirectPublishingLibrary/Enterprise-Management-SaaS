import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/theme.css";
import App from "./App";
import { AuthProvider } from "./lib/auth";
import { NotificationProvider } from "./lib/notifications";
import { LanguageProvider } from "./lib/language";
import { ErrorBoundary } from "./components/ErrorBoundary";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <BrowserRouter>
          <LanguageProvider>
            <AuthProvider>
              <NotificationProvider>
                <App />
              </NotificationProvider>
            </AuthProvider>
          </LanguageProvider>
        </BrowserRouter>
      </HelmetProvider>
    </ErrorBoundary>
  </React.StrictMode>
);