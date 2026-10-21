import axios from "axios";
import toast from "react-hot-toast";

// Base API URL
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? "https://nexifour.ng/sakora/api"
    : "http://localhost:5100/api");

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    "Content-Type": "application/json",
  },
});

// Token management
let authToken = null;

export const setToken = (token) => {
  authToken = token;
  if (token) {
    window.__sakoraSessionExpired = false;
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    localStorage.setItem("sakora_token", token);
  } else {
    delete api.defaults.headers.common["Authorization"];
    localStorage.removeItem("sakora_token");
  }
};

export const getToken = () => {
  if (!authToken) {
    authToken = localStorage.getItem("sakora_token");
    if (authToken) {
      api.defaults.headers.common["Authorization"] = `Bearer ${authToken}`;
    }
  }
  return authToken;
};

export const removeToken = () => {
  authToken = null;
  delete api.defaults.headers.common["Authorization"];
  localStorage.removeItem("sakora_token");
  localStorage.removeItem("sakora_user");
};

// Initialize token from localStorage on startup
getToken();

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add timestamp to prevent caching
    if (config.method === "get") {
      config.params = {
        ...config.params,
        _t: Date.now(),
      };
    }

    // Add correlation ID for tracking
    config.headers["X-Request-ID"] =
      Date.now().toString() + Math.random().toString(36).substr(2, 9);

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Return response.data directly so React Query gets the actual data
    // This makes it easier to access: data.data.items instead of data.data.data.items
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle network errors
    if (!error.response) {
      toast.error("Network error. Please check your connection and try again.");
      return Promise.reject({
        message: "Network error",
        type: "NETWORK_ERROR",
      });
    }

    const { status, data } = error.response;

    // Handle authentication errors (skip login/register — those 401s are invalid credentials)
    const isAuthEndpoint =
      originalRequest.url?.includes("/auth/login") ||
      originalRequest.url?.includes("/auth/register") ||
      originalRequest.url?.includes("/auth/google") ||
      originalRequest.url?.includes("/auth/verify-email") ||
      originalRequest.url?.includes("/auth/resend-verification") ||
      originalRequest.url?.includes("/auth/forgot-password") ||
      originalRequest.url?.includes("/auth/reset-password");
    const isPublicStorefront =
      /\/storefront\/(?!settings)/.test(originalRequest.url || "") ||
      window.location.pathname.startsWith("/shop") ||
      window.location.pathname.startsWith("/track");

    if (
      status === 401 &&
      !isAuthEndpoint &&
      !isPublicStorefront
    ) {
      if (!window.__sakoraSessionExpired) {
        window.__sakoraSessionExpired = true
        removeToken()
        window.__store__?.dispatch({ type: "auth/clearAuth" })
        toast.error("Session expired. Please log in again.")
      }

      return Promise.reject({
        message: "Session expired",
        type: "AUTH_ERROR",
        status,
      });
    }

    // Handle other HTTP errors
    let errorMessage = data?.message || getErrorMessage(status);

    // Handle validation errors - combine multiple field errors into one message
    if (status === 400 && data?.errors && Array.isArray(data.errors)) {
      const validationMessages = data.errors
        .map((err) => `${err.field}: ${err.message}`)
        .join(", ");
      errorMessage = validationMessages || errorMessage;
    }

    // Don't show toast for certain silent operations
    const silentOperations = [
      "/auth/profile",
      "/dashboard/stats",
      "/storefront/settings",
    ];
    const isSilentOperation = silentOperations.some((path) =>
      originalRequest.url.includes(path)
    );

    if (!isSilentOperation) {
      if (status >= 500) {
        toast.error("Server error. Please try again later.");
      } else if (status >= 400 && status < 500) {
        // Only show one toast per error
        toast.error(errorMessage, { id: originalRequest.url });
      }
    }

    return Promise.reject({
      message: errorMessage,
      type: "HTTP_ERROR",
      status,
      data: data?.details || data?.errors || null,
      response: error.response,
    });
  }
);

// Helper function to get user-friendly error messages
const getErrorMessage = (status) => {
  switch (status) {
    case 400:
      return "Invalid request. Please check your data.";
    case 403:
      return "You don't have permission to perform this action.";
    case 404:
      return "The requested resource was not found.";
    case 409:
      return "This resource already exists or conflicts with existing data.";
    case 422:
      return "Invalid data provided. Please check your inputs.";
    case 429:
      return "Too many requests. Please wait a moment.";
    case 500:
      return "Server error. Please try again later.";
    case 502:
      return "Server is temporarily unavailable.";
    case 503:
      return "Service temporarily unavailable.";
    default:
      return "An unexpected error occurred.";
  }
};

// API methods
const apiMethods = {
  // Generic methods
  get: (url, config = {}) => api.get(url, config),
  post: (url, data = {}, config = {}) => api.post(url, data, config),
  put: (url, data = {}, config = {}) => api.put(url, data, config),
  patch: (url, data = {}, config = {}) => api.patch(url, data, config),
  delete: (url, config = {}) => api.delete(url, config),

  // Authentication
  auth: {
    login: (credentials) => api.post("/auth/login", credentials),
    register: (userData) => api.post("/auth/register", userData),
    google: (data) => api.post("/auth/google", data),
    verifyEmail: (data) => api.post("/auth/verify-email", data),
    resendVerification: (data) => api.post("/auth/resend-verification", data),
    forgotPassword: (data) => api.post("/auth/forgot-password", data),
    resetPassword: (data) => api.post("/auth/reset-password", data),
    logout: () => api.post("/auth/logout"),
    profile: () => api.get("/auth/profile"),
    updateProfile: (data) => api.put("/auth/profile", data),
    changePassword: (data) => api.put("/auth/change-password", data),
    sessions: () => api.get("/auth/sessions"),
    revokeSession: (sessionId) => api.delete(`/auth/sessions/${sessionId}`),
  },

  // Business
  business: {
    profile: () => api.get("/business/profile"),
    updateProfile: (data) => api.put("/business/profile", data),
    branches: () => api.get("/business/branches"),
    createBranch: (data) => api.post("/business/branches", data),
    updateBranch: (id, data) => api.put(`/business/branches/${id}`, data),
    deleteBranch: (id) => api.delete(`/business/branches/${id}`),
    stats: () => api.get("/business/stats"),
  },

  // Products
  products: {
    list: (params = {}) => api.get("/products", { params }),
    get: (id) => api.get(`/products/${id}`),
    create: (data) => api.post("/products", data),
    update: (id, data) => api.put(`/products/${id}`, data),
    delete: (id) => api.delete(`/products/${id}`),
    bulkImport: (data) => api.post("/products/bulk-import", data),
    categories: () => api.get("/products/categories/list"),
    createCategory: (data) => api.post("/products/categories", data),
    updateCategory: (id, data) => api.put(`/products/categories/${id}`, data),
    deleteCategory: (id) => api.delete(`/products/categories/${id}`),
  },

  // Inventory
  inventory: {
    list: (params = {}) => api.get("/inventory", { params }),
    get: (id) => api.get(`/inventory/${id}`),
    adjust: (id, data) => api.post(`/inventory/${id}/adjust`, data),
    lowStock: () => api.get("/inventory/low-stock"),
    valuation: () => api.get("/inventory/valuation"),
  },

  // Sales
  sales: {
    list: (params = {}) => api.get("/sales", { params }),
    get: (id) => api.get(`/sales/${id}`),
    create: (data) => api.post("/sales", data),
    update: (id, data) => api.put(`/sales/${id}`, data),
    delete: (id) => api.delete(`/sales/${id}`),
    receipt: (id) => api.get(`/sales/${id}/receipt`),
    stats: (params = {}) => api.get("/sales/stats", { params }),
  },

  // Purchases
  purchases: {
    list: (params = {}) => api.get("/purchases", { params }),
    get: (id) => api.get(`/purchases/${id}`),
    create: (data) => api.post("/purchases", data),
    update: (id, data) => api.put(`/purchases/${id}`, data),
    delete: (id) => api.delete(`/purchases/${id}`),
    stats: (params = {}) => api.get("/purchases/stats", { params }),
  },

  // Expenses
  expenses: {
    list: (params = {}) => api.get("/expenses", { params }),
    get: (id) => api.get(`/expenses/${id}`),
    create: (data) => api.post("/expenses", data),
    update: (id, data) => api.put(`/expenses/${id}`, data),
    delete: (id) => api.delete(`/expenses/${id}`),
    categories: () => api.get("/expenses/categories"),
    createCategory: (data) => api.post("/expenses/categories", data),
    updateCategory: (id, data) => api.put(`/expenses/categories/${id}`, data),
    deleteCategory: (id) => api.delete(`/expenses/categories/${id}`),
    stats: (params = {}) => api.get("/expenses/stats", { params }),
  },

  // Customers
  customers: {
    list: (params = {}) => api.get("/customers", { params }),
    get: (id) => api.get(`/customers/${id}`),
    create: (data) => api.post("/customers", data),
    update: (id, data) => api.put(`/customers/${id}`, data),
    delete: (id) => api.delete(`/customers/${id}`),
    transactions: (id, params = {}) =>
      api.get(`/customers/${id}/transactions`, { params }),
  },

  // Suppliers
  suppliers: {
    list: (params = {}) => api.get("/suppliers", { params }),
    get: (id) => api.get(`/suppliers/${id}`),
    create: (data) => api.post("/suppliers", data),
    update: (id, data) => api.put(`/suppliers/${id}`, data),
    delete: (id) => api.delete(`/suppliers/${id}`),
    transactions: (id, params = {}) =>
      api.get(`/suppliers/${id}/transactions`, { params }),
  },

  // Cash Management
  cash: {
    balance: () => api.get("/cash/balance"),
    transactions: (params = {}) => api.get("/cash/transactions", { params }),
    recordManual: (data) => api.post("/cash/manual", data),
    setOpeningBalance: (data) => api.post("/cash/opening-balance", data),
    summary: (params = {}) => api.get("/cash/summary", { params }),
    flow: (params = {}) => api.get("/cash/flow", { params }),
  },

  // Reports
  reports: {
    sales: (params = {}) => api.get("/reports/sales", { params }),
    purchases: (params = {}) => api.get("/reports/purchases", { params }),
    expenses: (params = {}) => api.get("/reports/expenses", { params }),
    "profit-loss": (params = {}) => api.get("/reports/profit-loss", { params }),
    inventory: (params = {}) => api.get("/reports/inventory", { params }),
  },

  // Settings
  settings: {
    get: () => api.get("/settings"),
    updateBusiness: (data) => api.put("/settings/business", data),
    updatePreferences: (data) => api.put("/settings/preferences", data),
    exportData: (type, params = {}) =>
      api.get(`/settings/export/${type}`, { params }),
    backup: () => api.post("/settings/backup"),
    systemInfo: () => api.get("/settings/system"),
    reset: (data) => api.post("/settings/reset", data),
  },

  vat: {
    summary: (params = {}) => api.get("/vat/summary", { params }),
    pay: (data) => api.post("/vat/payments", data),
  },

  // Dashboard
  dashboard: {
    stats: () => api.get("/dashboard/stats"),
    charts: (params = {}) => api.get("/dashboard/charts", { params }),
    recent: () => api.get("/dashboard/recent"),
    alerts: () => api.get("/dashboard/alerts"),
  },

  storefront: {
    get: (slug) => api.get(`/storefront/${slug}`),
    checkout: (slug, data) => api.post(`/storefront/${slug}/checkout`, data),
    order: (slug, orderNumber) =>
      api.get(`/storefront/${slug}/orders/${orderNumber}`),
    verify: (slug, orderNumber, data = {}) =>
      api.post(`/storefront/${slug}/orders/${orderNumber}/verify`, data),
    complaint: (slug, orderNumber, data) =>
      api.post(`/storefront/${slug}/orders/${orderNumber}/complaint`, data),
    settings: () => api.get("/storefront/settings"),
    updateSettings: (data) => api.put("/storefront/settings", data),
  },

  orders: {
    list: (params = {}) => api.get("/orders", { params }),
    get: (id) => api.get(`/orders/${id}`),
    create: (data) => api.post("/orders", data),
    updateStatus: (id, status) => api.patch(`/orders/${id}/status`, { status }),
  },

  subscriptions: {
    plans: () => api.get("/subscriptions/plans"),
    checkout: (plan, interval = "month") =>
      api.post("/subscriptions/checkout", { plan, interval }),
    verify: (data) => api.post("/subscriptions/verify", data),
    cancel: () => api.post("/subscriptions/cancel"),
  },

  referrals: {
    get: () => api.get("/referrals"),
    validate: (code) => api.get(`/referrals/validate/${encodeURIComponent(code)}`),
    requestPayout: (data = {}) => api.post("/referrals/payout-request", data),
  },

  notifications: {
    list: (params = {}) => api.get("/notifications", { params }),
    markRead: (id) => api.patch(`/notifications/${id}/read`),
    markAllRead: () => api.patch("/notifications/read-all"),
  },

  support: {
    list: () => api.get("/support"),
    get: (id) => api.get(`/support/${id}`),
    create: (data) => api.post("/support", data),
    reply: (id, message) => api.post(`/support/${id}/messages`, { message }),
    close: (id) => api.patch(`/support/${id}`, { status: "closed" }),
  },

  users: {
    list: () => api.get("/users"),
    permissions: () => api.get("/users/permissions"),
    create: (data) => api.post("/users", data),
    update: (id, data) => api.put(`/users/${id}`, data),
  },

  // File uploads
  upload: {
    single: (file, type = "general") => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      return api.post("/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
    },
    multiple: (files, type = "general") => {
      const formData = new FormData();
      files.forEach((file, index) => {
        formData.append(`files[${index}]`, file);
      });
      formData.append("type", type);

      return api.post("/upload/multiple", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
    },
  },
};

// Export token management functions
apiMethods.setToken = setToken;
apiMethods.getToken = getToken;
apiMethods.removeToken = removeToken;

export default apiMethods;
