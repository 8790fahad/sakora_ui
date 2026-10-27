import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { QueryClient, QueryClientProvider } from "react-query";
import { Toaster } from "react-hot-toast";
import { store, persistor } from "./store/store.js";
import App from "./App.jsx";
import VersionUpdate from "./components/VersionUpdate.jsx";
import { APP_UPDATE_RETURN_KEY } from "./version.js";
import "./index.css";

const startupUrl = new URL(window.location.href);
const returnTo = sessionStorage.getItem(APP_UPDATE_RETURN_KEY);
if (returnTo || startupUrl.pathname.includes("/__app_update_")) {
  sessionStorage.removeItem(APP_UPDATE_RETURN_KEY);
  window.history.replaceState(window.history.state, "", returnTo || "/");
} else if (startupUrl.searchParams.has("v")) {
  startupUrl.searchParams.delete("v");
  const next = `${startupUrl.pathname}${startupUrl.search}${startupUrl.hash}`;
  window.history.replaceState(window.history.state, "", next);
}

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
    },
  },
});

// Loading component for PersistGate
const LoadingComponent = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="spinner w-8 h-8 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading sakora...</p>
    </div>
  </div>
);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={<LoadingComponent />} persistor={persistor}>
        <QueryClientProvider client={queryClient}>
          <VersionUpdate />
          <App />
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 4000,
              style: {
                background: "#363636",
                color: "#fff",
                fontSize: "14px",
                borderRadius: "8px",
                padding: "12px 16px",
              },
              success: {
                iconTheme: {
                  primary: "#10B981",
                  secondary: "#fff",
                },
              },
              error: {
                iconTheme: {
                  primary: "#EF4444",
                  secondary: "#fff",
                },
              },
            }}
          />
        </QueryClientProvider>
      </PersistGate>
    </Provider>
  </React.StrictMode>
);
