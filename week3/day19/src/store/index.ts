import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import userSlice from './slices/userSlice';
import analyticsSlice from './slices/analyticsSlice';
import offlineSlice from './slices/offlineSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    user: userSlice,
    analytics: analyticsSlice,
    offline: offlineSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
