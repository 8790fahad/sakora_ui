import { configureStore } from '@reduxjs/toolkit'
import { persistStore, persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage'
import { combineReducers } from '@reduxjs/toolkit'

import authSlice from './slices/authSlice'
import businessSlice from './slices/businessSlice'
import uiSlice from './slices/uiSlice'
import syncSlice from './slices/syncSlice'

// Persist config
const persistConfig = {
  key: 'sakora-mobile',
  storage,
  whitelist: ['auth', 'business', 'sync'], // Only persist these reducers
  version: 1,
}

// Root reducer
const rootReducer = combineReducers({
  auth: authSlice,
  business: businessSlice,
  ui: uiSlice,
  sync: syncSlice,
})

// Persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer)

// Configure store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'persist/PERSIST',
          'persist/REHYDRATE',
          'persist/PAUSE',
          'persist/PURGE',
          'persist/REGISTER',
        ],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
})

// Persistor
export const persistor = persistStore(store)

// Export store and persistor
export default store
