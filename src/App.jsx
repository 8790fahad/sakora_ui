import React, { useEffect, Suspense, lazy } from "react";
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
import OfflineStatus from "./components/offline/OfflineStatus";
import ErrorBoundary from "./components/ui/ErrorBoundary";
import {
  selectIsAuthenticated,
  selectAuthLoading,
  setTokenFromStorage,
} from "./store/slices/authSlice";
import { setOnlineStatus } from "./store/slices/syncSlice";
import { setTheme } from "./store/slices/uiSlice";
import { initializeOffline, syncManager } from "./utils/offline";

const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("./pages/auth/RegisterPage"));
const DashboardPage = lazy(() => import("./pages/dashboard/DashboardPage"));
const ProductsPage = lazy(() => import("./pages/products/ProductsPage"));
const SalesPage = lazy(() => import("./pages/sales/SalesPage"));
const PurchasesPage = lazy(() => import("./pages/purchases/PurchasesPage"));
const ExpensesPage = lazy(() => import("./pages/expenses/ExpensesPage"));
const CustomersPage = lazy(() => import("./pages/customers/CustomersPage"));
const SuppliersPage = lazy(() => import("./pages/suppliers/SuppliersPage"));
const CashPage = lazy(() => import("./pages/cash/CashPage"));
const ReportsPage = lazy(() => import("./pages/reports/ReportsPage"));
const VatPage = lazy(() => import("./pages/vat/VatPage"));
const SettingsPage = lazy(() => import("./pages/settings/SettingsPage"));
const ProfilePage = lazy(() => import("./pages/profile/ProfilePage"));
const NotFoundPage = lazy(() => import("./pages/errors/NotFoundPage"));
const StorePage = lazy(() => import("./pages/storefront/StorePage"));
const OrderStatusPage = lazy(() => import("./pages/storefront/OrderStatusPage"));
const StorefrontSettingsPage = lazy(() => import("./pages/storefront/StorefrontSettingsPage"));
const OrdersPage = lazy(() => import("./pages/orders/OrdersPage"));
const TeamPage = lazy(() => import("./pages/team/TeamPage"));
const BillingPage = lazy(() => import("./pages/billing/BillingPage"));
const InvoicesPage = lazy(() => import("./pages/invoices/InvoicesPage"));
const LegalPage = lazy(() => import("./pages/legal/LegalPage"));
const LandingPage = lazy(() => import("./pages/landing/LandingPage"));

function RouteFallback() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="spinner w-8 h-8" />
    </div>
  );
}

function App() {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isAuthLoading = useSelector(selectAuthLoading);

  // Initialize app
  useEffect(() => {
    // Check for stored authentication
    const storedToken = localStorage.getItem("sakora_token");
    const storedUser = localStorage.getItem("sakora_user");

    if (storedToken && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        dispatch(setTokenFromStorage({ token: storedToken, user }));
      } catch (error) {
        console.error("Error parsing stored user data:", error);
        localStorage.removeItem("sakora_token");
        localStorage.removeItem("sakora_user");
      }
    }

    // Set up online/offline listeners
    const handleOnline = () => dispatch(setOnlineStatus(true));
    const handleOffline = () => dispatch(setOnlineStatus(false));

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Apply theme
    const storedTheme = localStorage.getItem("sakora_theme");
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
      const currentTheme = localStorage.getItem("sakora_theme");
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
        <ErrorBoundary>
          <OfflineIndicator />
          <OfflineStatus />
        </ErrorBoundary>

        <Suspense fallback={<RouteFallback />}>
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

          <Route path="/legal/:slug" element={<LegalPage />} />

          <Route path="/shop/:slug" element={<StorePage />} />
          <Route
            path="/shop/:slug/order/:orderNumber"
            element={<OrderStatusPage />}
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
            path="/orders"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <OrdersPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/invoices"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <InvoicesPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/storefront"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <StorefrontSettingsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/team"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <TeamPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/billing"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <BillingPage />
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
            path="/vat"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <VatPage />
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

          <Route
            path="/"
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <LandingPage />
              )
            }
          />

          {/* 404 page */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </Suspense>
      </div>
    </Router>
  );
}

export default App;
