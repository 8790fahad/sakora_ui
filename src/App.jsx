import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

// Import components
import AuthLayout from "./components/layouts/AuthLayout";
import DashboardLayout from "./components/layouts/DashboardLayout";
import LoadingScreen from "./components/ui/LoadingScreen";
import OfflineIndicator from "./components/ui/OfflineIndicator";
import PWAInstallPrompt from "./components/ui/PWAInstallPrompt";
import OfflineStatus from "./components/offline/OfflineStatus";

// Import pages
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import ProductsPage from "./pages/products/ProductsPage";
import SalesPage from "./pages/sales/SalesPage";
import PurchasesPage from "./pages/purchases/PurchasesPage";
import ExpensesPage from "./pages/expenses/ExpensesPage";
import CustomersPage from "./pages/customers/CustomersPage";
import SuppliersPage from "./pages/suppliers/SuppliersPage";
import CashPage from "./pages/cash/CashPage";
import ReportsPage from "./pages/reports/ReportsPage";
import SettingsPage from "./pages/settings/SettingsPage";
import ProfilePage from "./pages/profile/ProfilePage";
import NotFoundPage from "./pages/errors/NotFoundPage";

// Import Redux slices
import {
  selectIsAuthenticated,
  selectAuthLoading,
  setTokenFromStorage,
} from "./store/slices/authSlice";
import { setOnlineStatus } from "./store/slices/syncSlice";
import { setTheme } from "./store/slices/uiSlice";

// Import services
import api from "./services/api";

// Import offline utilities
import { initializeOffline, syncManager } from "./utils/offline";

function App() {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isAuthLoading = useSelector(selectAuthLoading);

  // Initialize app
  useEffect(() => {
    // Check for stored authentication
    const storedToken = localStorage.getItem("inventria_token");
    const storedUser = localStorage.getItem("inventria_user");

    if (storedToken && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        dispatch(setTokenFromStorage({ token: storedToken, user }));
      } catch (error) {
        console.error("Error parsing stored user data:", error);
        localStorage.removeItem("inventria_token");
        localStorage.removeItem("inventria_user");
      }
    }

    // Set up online/offline listeners
    const handleOnline = () => dispatch(setOnlineStatus(true));
    const handleOffline = () => dispatch(setOnlineStatus(false));

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Apply theme
    const storedTheme = localStorage.getItem("inventria_theme");
    if (storedTheme) {
      dispatch(setTheme(storedTheme));
      applyTheme(storedTheme);
    } else {
      // Auto-detect system theme
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
      dispatch(setTheme(systemTheme));
      applyTheme(systemTheme);
    }

    // Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleThemeChange = (e) => {
      const currentTheme = localStorage.getItem("inventria_theme");
      if (currentTheme === "system") {
        const newTheme = e.matches ? "dark" : "light";
        applyTheme(newTheme);
      }
    };
    mediaQuery.addEventListener("change", handleThemeChange);

    // Initialize offline capabilities
    initializeOffline().then((success) => {
      if (success) {
        console.log("Offline capabilities initialized successfully");

        // Set up sync manager callbacks
        syncManager.onSync((event) => {
          if (event.type === "success") {
            console.log("Data synced successfully");
          }
        });
      } else {
        console.warn("Failed to initialize offline capabilities");
      }
    });

    // Cleanup
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      mediaQuery.removeEventListener("change", handleThemeChange);
    };
  }, [dispatch]);

  // Apply theme to document
  const applyTheme = (theme) => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  // Protected route wrapper
  const ProtectedRoute = ({ children }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    return children;
  };

  // Public route wrapper (redirects to dashboard if authenticated)
  const PublicRoute = ({ children }) => {
    if (isAuthenticated) {
      return <Navigate to="/dashboard" replace />;
    }
    return children;
  };

  // Show loading screen during initial authentication check
  if (isAuthLoading) {
    return <LoadingScreen />;
  }

  return (
    <Router>
      <div className="App min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Offline indicator */}
        <OfflineIndicator />

        {/* PWA install prompt */}
        <PWAInstallPrompt />

        {/* Offline status and sync manager */}
        <OfflineStatus />

        <Routes>
          {/* Public routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <AuthLayout>
                  <LoginPage />
                </AuthLayout>
              </PublicRoute>
            }
          />

          <Route
            path="/register"
            element={
              <PublicRoute>
                <AuthLayout>
                  <RegisterPage />
                </AuthLayout>
              </PublicRoute>
            }
          />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <DashboardPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/products"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ProductsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/sales"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <SalesPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/purchases"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <PurchasesPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/expenses"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ExpensesPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/customers"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <CustomersPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/suppliers"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <SuppliersPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/cash"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <CashPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ReportsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <SettingsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ProfilePage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Default redirects */}
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* 404 page */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
