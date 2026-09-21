import { createSlice } from "@reduxjs/toolkit";

// Initial state
const initialState = {
  // Sync status
  isOnline: navigator.onLine,
  lastSyncTime: null,
  isSyncing: false,
  syncInProgress: false,

  // Pending operations (for offline mode)
  pendingOperations: [],

  // Data cache timestamps
  lastFetch: {
    products: null,
    sales: null,
    purchases: null,
    expenses: null,
    customers: null,
    suppliers: null,
    categories: null,
    dashboard: null,
  },

  // Sync conflicts
  conflicts: [],

  // Sync settings
  settings: {
    autoSync: true,
    syncInterval: 5 * 60 * 1000, // 5 minutes
    retryAttempts: 3,
    retryDelay: 2000, // 2 seconds
  },

  // Error tracking
  syncErrors: [],
  failedOperations: [],
};

// Sync slice
const syncSlice = createSlice({
  name: "sync",
  initialState,
  reducers: {
    // Network status
    setOnlineStatus: (state, action) => {
      state.isOnline = action.payload;
    },

    // Sync status
    setSyncStatus: (state, action) => {
      state.isSyncing = action.payload;
    },
    setSyncInProgress: (state, action) => {
      state.syncInProgress = action.payload;
    },
    updateLastSyncTime: (state) => {
      state.lastSyncTime = new Date().toISOString();
    },

    // Pending operations
    addPendingOperation: (state, action) => {
      const operation = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        attempts: 0,
        ...action.payload,
      };
      state.pendingOperations.push(operation);
    },

    removePendingOperation: (state, action) => {
      state.pendingOperations = state.pendingOperations.filter(
        (op) => op.id !== action.payload
      );
    },

    updatePendingOperation: (state, action) => {
      const { id, updates } = action.payload;
      const index = state.pendingOperations.findIndex((op) => op.id === id);
      if (index !== -1) {
        state.pendingOperations[index] = {
          ...state.pendingOperations[index],
          ...updates,
          attempts: state.pendingOperations[index].attempts + 1,
        };
      }
    },

    clearPendingOperations: (state) => {
      state.pendingOperations = [];
    },

    // Data cache timestamps
    updateLastFetch: (state, action) => {
      const { module, timestamp } = action.payload;
      state.lastFetch[module] = timestamp || new Date().toISOString();
    },

    clearLastFetch: (state, action) => {
      if (action.payload) {
        state.lastFetch[action.payload] = null;
      } else {
        // Clear all
        Object.keys(state.lastFetch).forEach((key) => {
          state.lastFetch[key] = null;
        });
      }
    },

    // Sync conflicts
    addConflict: (state, action) => {
      const conflict = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        resolved: false,
        ...action.payload,
      };
      state.conflicts.push(conflict);
    },

    resolveConflict: (state, action) => {
      const { id, resolution } = action.payload;
      const index = state.conflicts.findIndex((c) => c.id === id);
      if (index !== -1) {
        state.conflicts[index].resolved = true;
        state.conflicts[index].resolution = resolution;
        state.conflicts[index].resolvedAt = new Date().toISOString();
      }
    },

    removeConflict: (state, action) => {
      state.conflicts = state.conflicts.filter((c) => c.id !== action.payload);
    },

    clearConflicts: (state) => {
      state.conflicts = [];
    },

    // Sync settings
    updateSyncSettings: (state, action) => {
      state.settings = { ...state.settings, ...action.payload };
    },

    // Error tracking
    addSyncError: (state, action) => {
      const error = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        ...action.payload,
      };
      state.syncErrors.push(error);

      // Keep only last 50 errors
      if (state.syncErrors.length > 50) {
        state.syncErrors = state.syncErrors.slice(-50);
      }
    },

    clearSyncErrors: (state) => {
      state.syncErrors = [];
    },

    // Failed operations
    addFailedOperation: (state, action) => {
      const operation = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        retryCount: 0,
        ...action.payload,
      };
      state.failedOperations.push(operation);
    },

    updateFailedOperation: (state, action) => {
      const { id, updates } = action.payload;
      const index = state.failedOperations.findIndex((op) => op.id === id);
      if (index !== -1) {
        state.failedOperations[index] = {
          ...state.failedOperations[index],
          ...updates,
          retryCount: state.failedOperations[index].retryCount + 1,
        };
      }
    },

    removeFailedOperation: (state, action) => {
      state.failedOperations = state.failedOperations.filter(
        (op) => op.id !== action.payload
      );
    },

    clearFailedOperations: (state) => {
      state.failedOperations = [];
    },

    // Bulk operations for performance
    batchUpdatePendingOperations: (state, action) => {
      const updates = action.payload; // Array of { id, updates }
      updates.forEach(({ id, updates: operationUpdates }) => {
        const index = state.pendingOperations.findIndex((op) => op.id === id);
        if (index !== -1) {
          state.pendingOperations[index] = {
            ...state.pendingOperations[index],
            ...operationUpdates,
          };
        }
      });
    },

    // Reset sync state
    resetSyncState: (state) => {
      return {
        ...initialState,
        isOnline: navigator.onLine,
        settings: state.settings, // Preserve settings
      };
    },

    // Quick actions for common sync operations
    markDataStale: (state, action) => {
      const modules = Array.isArray(action.payload)
        ? action.payload
        : [action.payload];
      modules.forEach((module) => {
        if (state.lastFetch[module]) {
          state.lastFetch[module] = null;
        }
      });
    },

    setAllDataStale: (state) => {
      Object.keys(state.lastFetch).forEach((key) => {
        state.lastFetch[key] = null;
      });
    },
  },
});

export const {
  // Network status
  setOnlineStatus,

  // Sync status
  setSyncStatus,
  setSyncInProgress,
  updateLastSyncTime,

  // Pending operations
  addPendingOperation,
  removePendingOperation,
  updatePendingOperation,
  clearPendingOperations,

  // Data cache
  updateLastFetch,
  clearLastFetch,

  // Conflicts
  addConflict,
  resolveConflict,
  removeConflict,
  clearConflicts,

  // Settings
  updateSyncSettings,

  // Errors
  addSyncError,
  clearSyncErrors,

  // Failed operations
  addFailedOperation,
  updateFailedOperation,
  removeFailedOperation,
  clearFailedOperations,

  // Batch operations
  batchUpdatePendingOperations,

  // Reset
  resetSyncState,

  // Quick actions
  markDataStale,
  setAllDataStale,
} = syncSlice.actions;

export default syncSlice.reducer;

// Selectors
export const selectSync = (state) => state.sync;
export const selectIsOnline = (state) => state.sync.isOnline;
export const selectIsSyncing = (state) => state.sync.isSyncing;
export const selectLastSyncTime = (state) => state.sync.lastSyncTime;
export const selectPendingOperations = (state) => state.sync.pendingOperations;
export const selectLastFetch = (state) => state.sync.lastFetch;
export const selectConflicts = (state) => state.sync.conflicts;
export const selectSyncSettings = (state) => state.sync.settings;
export const selectSyncErrors = (state) => state.sync.syncErrors;
export const selectFailedOperations = (state) => state.sync.failedOperations;

// Computed selectors
export const selectPendingOperationsCount = (state) =>
  state.sync.pendingOperations.length;
export const selectUnresolvedConflictsCount = (state) =>
  state.sync.conflicts.filter((c) => !c.resolved).length;
export const selectHasPendingSync = (state) =>
  state.sync.pendingOperations.length > 0 ||
  state.sync.failedOperations.length > 0;

// Helper selector to check if data is stale
export const selectIsDataStale = (state, module, maxAge = 5 * 60 * 1000) => {
  const lastFetch = state.sync.lastFetch[module];
  if (!lastFetch) return true;

  const age = Date.now() - new Date(lastFetch).getTime();
  return age > maxAge;
};

