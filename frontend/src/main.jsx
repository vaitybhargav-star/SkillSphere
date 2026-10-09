import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";

import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import "./index.css";

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
const sentrySampleRate = Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || 0.0);

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    integrations: [new BrowserTracing()],
    tracesSampleRate: sentrySampleRate,
    environment: import.meta.env.MODE || "development",
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Sentry.ErrorBoundary fallback={<div>Something went wrong. Our team has been notified.</div>}>
        <React.Suspense fallback={<div />}> 
          <AuthProvider>
            <App />
          </AuthProvider>
        </React.Suspense>
      </Sentry.ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>
);
