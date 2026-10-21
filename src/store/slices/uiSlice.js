import { createSlice } from "@reduxjs/toolkit";

// Initial state
const initialState = {
  // Navigation
  sidebarOpen: false,
  activeTab: "dashboard",

  // Modals & Overlays
  modals: {
    productForm: false,
    saleForm: false,
    purchaseForm: false,
    expenseForm: false,
    customerForm: false,
    supplierForm: false,
    profileEdit: false,
    businessEdit: false,
    branchForm: false,
    categoryForm: false,
    confirmDialog: false,
  },

  // Loading states
  loading: {
    global: false,
    products: false,
    sales: false,
    purchases: false,
    expenses: false,
    customers: false,
    suppliers: false,
    reports: false,
  },

  // Notifications & Messages
  notifications: [],
  toast: {
    show: false,
    message: "",
    type: "info", // info, success, warning, error
  },

  // Form states
  forms: {
    product: { data: null, isEditing: false },
    sale: { data: null, isEditing: false },
    purchase: { data: null, isEditing: false },
    expense: { data: null, isEditing: false },
    customer: { data: null, isEditing: false },
    supplier: { data: null, isEditing: false },
  },

  // UI preferences
  preferences: {
    theme: "light", // light, dark, system
    currency: "NGN",
    currencySymbol: "₦",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "12h",
    language: "en",
    compactMode: false,
    notifications: {
      lowStock: true,
      sales: true,
      expenses: true,
      reports: false,
    },
  },

  // Search & Filters
  search: {
    products: "",
    sales: "",
    purchases: "",
    expenses: "",
    customers: "",
    suppliers: "",
  },

  filters: {
    products: {
      category: "",
      status: "all",
      sortBy: "name",
      sortOrder: "asc",
    },
    sales: {
      dateRange: "today",
      paymentStatus: "all",
      sortBy: "date",
      sortOrder: "desc",
    },
    purchases: {
      dateRange: "month",
      paymentStatus: "all",
      sortBy: "date",
      sortOrder: "desc",
    },
    expenses: {
      dateRange: "month",
      category: "",
      sortBy: "date",
      sortOrder: "desc",
    },
  },

  // Pagination
  pagination: {
    products: { page: 1, limit: 20, total: 0 },
    sales: { page: 1, limit: 20, total: 0 },
    purchases: { page: 1, limit: 20, total: 0 },
    expenses: { page: 1, limit: 20, total: 0 },
    customers: { page: 1, limit: 20, total: 0 },
    suppliers: { page: 1, limit: 20, total: 0 },
  },

  // Mobile-specific UI states
  mobile: {
    bottomSheetOpen: false,
    bottomSheetContent: null,
    quickActionOpen: false,
    cameraActive: false,
    scannerActive: false,
  },
};

// UI slice
const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    // Navigation
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    closeSidebar: (state) => {
      state.sidebarOpen = false;
    },
    setActiveTab: (state, action) => {
      state.activeTab = action.payload;
    },

    // Modals
    openModal: (state, action) => {
      state.modals[action.payload] = true;
    },
    closeModal: (state, action) => {
      state.modals[action.payload] = false;
    },
    closeAllModals: (state) => {
      Object.keys(state.modals).forEach((key) => {
        state.modals[key] = false;
      });
    },

    // Loading
    setLoading: (state, action) => {
      const { key, value } = action.payload;
      state.loading[key] = value;
    },
    setGlobalLoading: (state, action) => {
      state.loading.global = action.payload;
    },

    // Notifications
    addNotification: (state, action) => {
      const notification = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        read: false,
        ...action.payload,
      };
      state.notifications.unshift(notification);

      // Keep only last 50 notifications
      if (state.notifications.length > 50) {
        state.notifications = state.notifications.slice(0, 50);
      }
    },
    markNotificationRead: (state, action) => {
      const notification = state.notifications.find(
        (n) => n.id === action.payload
      );
      if (notification) {
        notification.read = true;
      }
    },
    markAllNotificationsRead: (state) => {
      state.notifications.forEach((n) => (n.read = true));
    },
    removeNotification: (state, action) => {
      state.notifications = state.notifications.filter(
        (n) => n.id !== action.payload
      );
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },

    // Toast
    showToast: (state, action) => {
      state.toast = {
        show: true,
        ...action.payload,
      };
    },
    hideToast: (state) => {
      state.toast.show = false;
    },

    // Forms
    setFormData: (state, action) => {
      const { form, data, isEditing = false } = action.payload;
      state.forms[form] = { data, isEditing };
    },
    clearFormData: (state, action) => {
      state.forms[action.payload] = { data: null, isEditing: false };
    },
    clearAllForms: (state) => {
      Object.keys(state.forms).forEach((key) => {
        state.forms[key] = { data: null, isEditing: false };
      });
    },

    // Preferences
    updatePreferences: (state, action) => {
      state.preferences = { ...state.preferences, ...action.payload };
    },
    setTheme: (state, action) => {
      state.preferences.theme = action.payload;
    },
    setCurrency: (state, action) => {
      state.preferences.currency = action.payload.currency;
      state.preferences.currencySymbol = action.payload.symbol;
    },

    // Search & Filters
    setSearch: (state, action) => {
      const { module, query } = action.payload;
      state.search[module] = query;
    },
    clearSearch: (state, action) => {
      state.search[action.payload] = "";
    },
    setFilter: (state, action) => {
      const { module, filters } = action.payload;
      state.filters[module] = { ...state.filters[module], ...filters };
    },
    resetFilters: (state, action) => {
      const module = action.payload;
      state.filters[module] = initialState.filters[module];
    },

    // Pagination
    setPagination: (state, action) => {
      const { module, pagination } = action.payload;
      state.pagination[module] = { ...state.pagination[module], ...pagination };
    },
    resetPagination: (state, action) => {
      const module = action.payload;
      state.pagination[module] = initialState.pagination[module];
    },

    // Mobile UI
    toggleBottomSheet: (state, action) => {
      state.mobile.bottomSheetOpen = !state.mobile.bottomSheetOpen;
      if (action.payload) {
        state.mobile.bottomSheetContent = action.payload;
      }
    },
    closeBottomSheet: (state) => {
      state.mobile.bottomSheetOpen = false;
      state.mobile.bottomSheetContent = null;
    },
    toggleQuickAction: (state) => {
      state.mobile.quickActionOpen = !state.mobile.quickActionOpen;
    },
    setCamera: (state, action) => {
      state.mobile.cameraActive = action.payload;
    },
    setScanner: (state, action) => {
      state.mobile.scannerActive = action.payload;
    },

    // Reset UI state
    resetUI: (state) => {
      return initialState;
    },
  },
});

export const {
  // Navigation
  toggleSidebar,
  closeSidebar,
  setActiveTab,

  // Modals
  openModal,
  closeModal,
  closeAllModals,

  // Loading
  setLoading,
  setGlobalLoading,

  // Notifications
  addNotification,
  markNotificationRead,
  markAllNotificationsRead,
  removeNotification,
  clearNotifications,

  // Toast
  showToast,
  hideToast,

  // Forms
  setFormData,
  clearFormData,
  clearAllForms,

  // Preferences
  updatePreferences,
  setTheme,
  setCurrency,

  // Search & Filters
  setSearch,
  clearSearch,
  setFilter,
  resetFilters,

  // Pagination
  setPagination,
  resetPagination,

  // Mobile UI
  toggleBottomSheet,
  closeBottomSheet,
  toggleQuickAction,
  setCamera,
  setScanner,

  // Reset
  resetUI,
} = uiSlice.actions;

export default uiSlice.reducer;

// Selectors
export const selectUI = (state) => state.ui;
export const selectSidebarOpen = (state) => state.ui.sidebarOpen;
export const selectActiveTab = (state) => state.ui.activeTab;
export const selectModals = (state) => state.ui.modals;
export const selectLoading = (state) => state.ui.loading;
export const selectNotifications = (state) => state.ui.notifications;
export const selectToast = (state) => state.ui.toast;
export const selectForms = (state) => state.ui.forms;
export const selectPreferences = (state) => state.ui.preferences;
export const selectSearch = (state) => state.ui.search;
export const selectFilters = (state) => state.ui.filters;
export const selectPagination = (state) => state.ui.pagination;
export const selectMobile = (state) => state.ui.mobile;

