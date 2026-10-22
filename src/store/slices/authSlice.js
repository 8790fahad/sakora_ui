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
      return rejectWithValue({
        message: error.message || error.response?.data?.message || 'Login failed',
        requiresVerification: Boolean(error.data?.requiresVerification),
        email: error.data?.email || credentials.email,
      })
    }
  }
)

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/register', userData)
      const payload = response.data || {}

      // Registration now requires email verification before a session is created
      if (payload.token) {
        api.setToken(payload.token)
      }

      return payload
    } catch (error) {
      return rejectWithValue(error.message || error.response?.data?.message || 'Registration failed')
    }
  }
)

export const verifyEmail = createAsyncThunk(
  'auth/verifyEmail',
  async ({ email, code }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/verify-email', { email, code })
      api.setToken(response.data.token)
      return response.data
    } catch (error) {
      return rejectWithValue(error.message || 'Email verification failed')
    }
  }
)

export const resendVerification = createAsyncThunk(
  'auth/resendVerification',
  async ({ email }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/resend-verification', { email })
      return response.data || response
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to resend verification code')
    }
  }
)

export const googleAuth = createAsyncThunk(
  'auth/google',
  async ({ idToken, businessName, marketingOptIn, referralCode, phones, description, registrationNumber, logo }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/google', {
        idToken,
        businessName,
        marketingOptIn,
        referralCode,
        phones,
        description,
        registrationNumber,
        logo,
      })
      api.setToken(response.data.token)
      return response.data
    } catch (error) {
      return rejectWithValue(error.message || 'Google sign-in failed')
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
        state.error =
          typeof action.payload === 'string'
            ? action.payload
            : action.payload?.message || 'Login failed'
        state.isAuthenticated = false
      })

      // Register
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false
        state.error = null
        if (action.payload?.token && action.payload?.user) {
          state.user = action.payload.user
          state.token = action.payload.token
          state.isAuthenticated = true
          localStorage.setItem('sakora_user', JSON.stringify(action.payload.user))
        } else {
          state.user = null
          state.token = null
          state.isAuthenticated = false
        }
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
        state.isAuthenticated = false
      })

      // Verify email
      .addCase(verifyEmail.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(verifyEmail.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload.user
        state.token = action.payload.token
        state.isAuthenticated = true
        state.error = null
        localStorage.setItem('sakora_user', JSON.stringify(action.payload.user))
      })
      .addCase(verifyEmail.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })

      // Resend verification
      .addCase(resendVerification.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(resendVerification.fulfilled, (state) => {
        state.isLoading = false
        state.error = null
      })
      .addCase(resendVerification.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })

      // Google auth
      .addCase(googleAuth.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(googleAuth.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload.user
        state.token = action.payload.token
        state.isAuthenticated = true
        state.error = null
        localStorage.setItem('sakora_user', JSON.stringify(action.payload.user))
      })
      .addCase(googleAuth.rejected, (state, action) => {
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

      // Fetch Profile — do not toggle isLoading. That flag unmounts the app
      // into the startup screen, which mounts Profile again and refetches.
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.user = action.payload
        if (action.payload) {
          localStorage.setItem('sakora_user', JSON.stringify(action.payload))
        }
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.error = action.payload
      })

      .addCase(updateUserProfile.pending, (state) => {
        state.error = null
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.user = action.payload
        state.error = null
        if (action.payload) {
          localStorage.setItem('sakora_user', JSON.stringify(action.payload))
        }
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.error = action.payload
      })

      .addCase(changePassword.pending, (state) => {
        state.error = null
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.error = null
      })
      .addCase(changePassword.rejected, (state, action) => {
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
