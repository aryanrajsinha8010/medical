import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorMessage: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMessage: error?.message || "Unexpected rendering error" };
  }

  componentDidCatch(error: Error) {
    console.error("[SwasthyaBillCheck ErrorBoundary]", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-paper text-ink flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-card border border-line rounded-2xl p-6 shadow-paper space-y-4 text-center">
            <h1 className="font-display text-2xl font-bold">Something went wrong</h1>
            <p className="text-sm text-muted">
              SwasthyaBillCheck ran into an unexpected display error. Your bill data was not lost.
            </p>
            <p className="text-xs font-mono text-flag bg-flag-soft/60 p-2.5 rounded-xl break-words">
              {this.state.errorMessage}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full min-h-[48px] rounded-xl bg-brand text-[rgb(var(--on-brand))] font-semibold text-sm"
            >
              Reload SwasthyaBillCheck
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>
);
