import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

// Initial state
const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
}

// Async thunks
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/login', credentials)

      // Set token in API service
      // Response interceptor returns response.data, so response = {success: true, data: {token: ...}}
      // response.data = {token: ...}
      api.setToken(response.data.token)

      return response.data
    } catch (error) {
      return rejectWithValue(error.message || error.response?.data?.message || 'Login failed')
    }
  }
)

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/register', userData)

      // Set token in API service
      // Response interceptor returns response.data, so response = {success: true, data: {token: ...}}
      // response.data = {token: ...}
      api.setToken(response.data.token)

      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Registration failed')
    }
  }
)

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await api.post('/auth/logout')

      // Remove token from API service
      api.removeToken()

      return true
    } catch (error) {
      // Even if logout fails on server, we should clear local state
      api.removeToken()
      return true
    }
  }
)

export const fetchUserProfile = createAsyncThunk(
  'auth/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/auth/profile')
      // Response interceptor returns response.data, so response = {success: true, data: {user: ...}}
      // response.data = {user: ...}
      return response.data.user
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch profile')
    }
  }
)

export const updateUserProfile = createAsyncThunk(
  'auth/updateProfile',
  async (profileData, { rejectWithValue }) => {
    try {
      const response = await api.put('/auth/profile', profileData)
      // Response interceptor returns response.data, so response = {success: true, data: {user: ...}}
      // response.data = {user: ...}
      return response.data.user
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update profile')
    }
  }
)

export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async (passwordData, { rejectWithValue }) => {
    try {
      const response = await api.put('/auth/change-password', passwordData)
      return response.data.message
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to change password')
    }
  }
)

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    setTokenFromStorage: (state, action) => {
      state.token = action.payload.token
      state.user = action.payload.user
      state.isAuthenticated = true

      // Set token in API service
      api.setToken(action.payload.token)
      localStorage.setItem('sakora_user', JSON.stringify(action.payload.user))
    },
    clearAuth: (state) => {
      state.user = null
      state.token = null
      state.isAuthenticated = false
      state.error = null

      // Remove token from API service
      api.removeToken()
      localStorage.removeItem('sakora_user')
    }
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload.user
        state.token = action.payload.token
        state.isAuthenticated = true
        state.error = null
        localStorage.setItem('sakora_user', JSON.stringify(action.payload.user))
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
        state.isAuthenticated = false
      })

      // Register
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload.user
        state.token = action.payload.token
        state.isAuthenticated = true
        state.error = null
        localStorage.setItem('sakora_user', JSON.stringify(action.payload.user))
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
        state.isAuthenticated = false
      })

      // Logout
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null
        state.token = null
        state.isAuthenticated = false
        state.error = null
        state.isLoading = false
        localStorage.removeItem('sakora_user')
      })

      // Fetch Profile
      .addCase(fetchUserProfile.pending, (state) => {
        state.isLoading = true
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })

      // Update Profile
      .addCase(updateUserProfile.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload
        state.error = null
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })

      // Change Password
      .addCase(changePassword.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.isLoading = false
        state.error = null
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
  },
})

export const { clearError, setTokenFromStorage, clearAuth } = authSlice.actions

export default authSlice.reducer

// Selectors
export const selectAuth = (state) => state.auth
export const selectUser = (state) => state.auth.user
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated
export const selectAuthLoading = (state) => state.auth.isLoading
export const selectAuthError = (state) => state.auth.error
export const selectUserPermissions = (state) =>
  state.auth.user?.permissions || []
export const selectHasPermission = (permission) => (state) => {
  const user = state.auth.user
  if (!user) return false
  if (user.role === "owner") return true
  return (user.permissions || []).includes(permission)
}
