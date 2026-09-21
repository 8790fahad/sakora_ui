import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

// Initial state
const initialState = {
  profile: null,
  branches: [],
  statistics: null,
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchBusinessProfile = createAsyncThunk(
  "business/fetchProfile",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/business/profile");
      // Response interceptor returns response.data, so response = {success: true, data: {business: ...}}
      // response.data = {business: ...}
      return response.data.business;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch business profile"
      );
    }
  }
);

export const updateBusinessProfile = createAsyncThunk(
  "business/updateProfile",
  async (profileData, { rejectWithValue }) => {
    try {
      const response = await api.put("/business/profile", profileData);
      // Response interceptor returns response.data, so response = {success: true, data: {business: ...}}
      // response.data = {business: ...}
      return response.data.business;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update business profile"
      );
    }
  }
);

export const fetchBranches = createAsyncThunk(
  "business/fetchBranches",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/business/branches");
      // Response interceptor returns response.data, so response = {success: true, data: {branches: ...}}
      // response.data = {branches: ...}
      return response.data.branches;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch branches"
      );
    }
  }
);

export const createBranch = createAsyncThunk(
  "business/createBranch",
  async (branchData, { rejectWithValue }) => {
    try {
      const response = await api.post("/business/branches", branchData);
      // Response interceptor returns response.data, so response = {success: true, data: {branch: ...}}
      // response.data = {branch: ...}
      return response.data.branch;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create branch"
      );
    }
  }
);

export const updateBranch = createAsyncThunk(
  "business/updateBranch",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/business/branches/${id}`, data);
      // Response interceptor returns response.data, so response = {success: true, data: {branch: ...}}
      // response.data = {branch: ...}
      return response.data.branch;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update branch"
      );
    }
  }
);

export const deleteBranch = createAsyncThunk(
  "business/deleteBranch",
  async (branchId, { rejectWithValue }) => {
    try {
      await api.delete(`/business/branches/${branchId}`);
      return branchId;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete branch"
      );
    }
  }
);

export const fetchBusinessStatistics = createAsyncThunk(
  "business/fetchStatistics",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/business/stats");
      // Response interceptor returns response.data, so response = {success: true, data: {stats: ...}}
      // response.data = {stats: ...}
      return response.data.stats;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch statistics"
      );
    }
  }
);

// Business slice
const businessSlice = createSlice({
  name: "business",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearBusiness: (state) => {
      state.profile = null;
      state.branches = [];
      state.statistics = null;
      state.error = null;
    },
    updateBranchLocally: (state, action) => {
      const { branchId, updates } = action.payload;
      const branchIndex = state.branches.findIndex(
        (branch) => branch.id === branchId
      );
      if (branchIndex !== -1) {
        state.branches[branchIndex] = {
          ...state.branches[branchIndex],
          ...updates,
        };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Business Profile
      .addCase(fetchBusinessProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBusinessProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.profile = action.payload;
      })
      .addCase(fetchBusinessProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Update Business Profile
      .addCase(updateBusinessProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateBusinessProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.profile = action.payload;
      })
      .addCase(updateBusinessProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Fetch Branches
      .addCase(fetchBranches.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBranches.fulfilled, (state, action) => {
        state.isLoading = false;
        state.branches = action.payload;
      })
      .addCase(fetchBranches.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Create Branch
      .addCase(createBranch.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createBranch.fulfilled, (state, action) => {
        state.isLoading = false;
        state.branches.push(action.payload);
      })
      .addCase(createBranch.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Update Branch
      .addCase(updateBranch.pending, (state) => {
        state.error = null;
      })
      .addCase(updateBranch.fulfilled, (state, action) => {
        const index = state.branches.findIndex(
          (branch) => branch.id === action.payload.id
        );
        if (index !== -1) {
          state.branches[index] = action.payload;
        }
      })
      .addCase(updateBranch.rejected, (state, action) => {
        state.error = action.payload;
      })

      // Delete Branch
      .addCase(deleteBranch.fulfilled, (state, action) => {
        state.branches = state.branches.filter(
          (branch) => branch.id !== action.payload
        );
      })
      .addCase(deleteBranch.rejected, (state, action) => {
        state.error = action.payload;
      })

      // Fetch Statistics
      .addCase(fetchBusinessStatistics.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBusinessStatistics.fulfilled, (state, action) => {
        state.isLoading = false;
        state.statistics = action.payload;
      })
      .addCase(fetchBusinessStatistics.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, clearBusiness, updateBranchLocally } =
  businessSlice.actions;

export default businessSlice.reducer;

// Selectors
export const selectBusiness = (state) => state.business;
export const selectBusinessProfile = (state) => state.business.profile;
export const selectBranches = (state) => state.business.branches;
export const selectBusinessStatistics = (state) => state.business.statistics;
export const selectBusinessLoading = (state) => state.business.isLoading;
export const selectBusinessError = (state) => state.business.error;
