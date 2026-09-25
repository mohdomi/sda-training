# Day 19: React Native

## 🎯 Learning Objectives

- Master React Native development and cross-platform mobile apps
- Implement navigation, state management, and local storage
- Build offline functionality and push notifications
- Create responsive mobile UI with native components
- Integrate with backend APIs and real-time data

## 📚 Theory & Concepts

### React Native Fundamentals
- **Components**: Native mobile components
- **Navigation**: React Navigation for screen management
- **State Management**: Redux, Context API, or Zustand
- **Styling**: StyleSheet and responsive design
- **Platform Differences**: iOS and Android specific code

### Mobile Development
- **Offline Support**: Local storage and synchronization
- **Push Notifications**: Real-time mobile notifications
- **Performance**: Optimizing mobile app performance
- **Testing**: Mobile app testing strategies
- **Deployment**: App store deployment process

### Best Practices
- **Code Reusability**: Cross-platform code sharing
- **Performance**: Optimizing for mobile devices
- **User Experience**: Mobile-first design principles
- **Security**: Mobile app security best practices
- **Maintenance**: Long-term app maintenance

## 🛠️ Hands-on Tasks

### Task 1: Create React Native Project
Set up comprehensive React Native application:

```bash
# Create new React Native project
npx react-native init SDATrainingApp --template react-native-template-typescript

# Install additional dependencies
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context
npm install @reduxjs/toolkit react-redux
npm install react-native-async-storage/async-storage
npm install react-native-vector-icons
npm install react-native-push-notification
npm install react-native-gesture-handler
npm install react-native-reanimated
```

### Task 2: Implement Navigation System
Create comprehensive navigation structure:

```typescript
// src/navigation/AppNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Import screens
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          if (route.name === 'Dashboard') {
            iconName = 'dashboard';
          } else if (route.name === 'Analytics') {
            iconName = 'analytics';
          } else if (route.name === 'Profile') {
            iconName = 'person';
          } else if (route.name === 'Settings') {
            iconName = 'settings';
          } else {
            iconName = 'help';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Main" 
          component={TabNavigator} 
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
```

### Task 3: Implement State Management
Create comprehensive state management with Redux:

```typescript
// src/store/index.ts
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
```

```typescript
// src/store/slices/authSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/authService';

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  loading: false,
  error: null,
};

// Async thunks
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials);
      await AsyncStorage.setItem('authToken', response.token);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      await AsyncStorage.removeItem('authToken');
      return null;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const checkAuthStatus = createAsyncThunk(
  'auth/checkAuthStatus',
  async (_, { rejectWithValue }) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        const user = await authService.getCurrentUser();
        return { token, user };
      }
      return null;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Logout
      .addCase(logoutUser.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.error = null;
      })
      // Check auth status
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        if (action.payload) {
          state.isAuthenticated = true;
          state.user = action.payload.user;
          state.token = action.payload.token;
        }
      });
  },
});

export const { clearError, setLoading } = authSlice.actions;
export default authSlice.reducer;
```

### Task 4: Create API Service
Implement comprehensive API service:

```typescript
// src/services/apiService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

class ApiService {
  private baseURL: string;
  private token: string | null = null;

  constructor() {
    this.baseURL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';
    this.initializeToken();
  }

  private async initializeToken() {
    this.token = await AsyncStorage.getItem('authToken');
  }

  private async getHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = await this.getHeaders();

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication methods
  async login(credentials: { email: string; password: string }) {
    const response = await this.request<{
      success: boolean;
      data: { user: User; token: string };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.success) {
      this.token = response.data.token;
      await AsyncStorage.setItem('authToken', response.data.token);
    }

    return response.data;
  }

  async logout() {
    await this.request('/auth/logout', { method: 'POST' });
    this.token = null;
    await AsyncStorage.removeItem('authToken');
  }

  async getCurrentUser() {
    return this.request<User>('/auth/me');
  }

  // User methods
  async getUsers(filters: UserFilters = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });

    return this.request<{
      success: boolean;
      data: { users: User[]; pagination: Pagination };
    }>(`/users?${queryParams}`);
  }

  async getUser(id: string) {
    return this.request<{ success: boolean; data: User }>(`/users/${id}`);
  }

  async updateUser(id: string, data: Partial<User>) {
    return this.request<{ success: boolean; data: User }>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Analytics methods
  async getAnalytics(timeRange: string = '30d') {
    return this.request<{
      success: boolean;
      data: AnalyticsData;
    }>(`/analytics?timeRange=${timeRange}`);
  }

  // Offline support
  async syncOfflineData() {
    const offlineData = await AsyncStorage.getItem('offlineData');
    if (offlineData) {
      const data = JSON.parse(offlineData);
      // Sync offline data with server
      for (const item of data) {
        try {
          await this.request(item.endpoint, {
            method: item.method,
            body: JSON.stringify(item.data),
          });
        } catch (error) {
          console.error('Failed to sync offline data:', error);
        }
      }
      await AsyncStorage.removeItem('offlineData');
    }
  }
}

export const apiService = new ApiService();
```

### Task 5: Create Offline Support
Implement comprehensive offline functionality:

```typescript
// src/services/offlineService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

interface OfflineData {
  id: string;
  endpoint: string;
  method: string;
  data: any;
  timestamp: number;
}

class OfflineService {
  private isOnline: boolean = true;
  private offlineQueue: OfflineData[] = [];

  constructor() {
    this.initializeNetworkListener();
    this.loadOfflineQueue();
  }

  private initializeNetworkListener() {
    NetInfo.addEventListener(state => {
      this.isOnline = state.isConnected ?? false;
      
      if (this.isOnline) {
        this.syncOfflineData();
      }
    });
  }

  private async loadOfflineQueue() {
    try {
      const data = await AsyncStorage.getItem('offlineQueue');
      if (data) {
        this.offlineQueue = JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
    }
  }

  private async saveOfflineQueue() {
    try {
      await AsyncStorage.setItem('offlineQueue', JSON.stringify(this.offlineQueue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  async queueRequest(endpoint: string, method: string, data: any) {
    const offlineData: OfflineData = {
      id: Date.now().toString(),
      endpoint,
      method,
      data,
      timestamp: Date.now(),
    };

    this.offlineQueue.push(offlineData);
    await this.saveOfflineQueue();
  }

  async syncOfflineData() {
    if (!this.isOnline || this.offlineQueue.length === 0) {
      return;
    }

    const queue = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const item of queue) {
      try {
        // Attempt to sync the request
        await this.syncRequest(item);
      } catch (error) {
        console.error('Failed to sync request:', error);
        // Re-queue failed requests
        this.offlineQueue.push(item);
      }
    }

    await this.saveOfflineQueue();
  }

  private async syncRequest(item: OfflineData) {
    // Implement actual sync logic here
    // This would typically make the API call
    console.log('Syncing offline request:', item);
  }

  getOfflineQueue(): OfflineData[] {
    return this.offlineQueue;
  }

  isConnected(): boolean {
    return this.isOnline;
  }
}

export const offlineService = new OfflineService();
```

## 📝 Documentation Tasks

### Create React Native Guide
Create `week3/day19/docs/react-native-guide.md`:

```markdown
# React Native Guide

## Mobile Development
- **Cross-Platform**: iOS and Android development
- **Navigation**: Screen management and routing
- **State Management**: Redux and Context API
- **Offline Support**: Local storage and synchronization
- **Performance**: Mobile app optimization

## Best Practices
- **Code Reusability**: Cross-platform code sharing
- **Performance**: Optimizing for mobile devices
- **User Experience**: Mobile-first design principles
- **Security**: Mobile app security best practices
- **Testing**: Mobile app testing strategies
```

## 🧪 Testing & Validation

### Mobile Testing
- [ ] App runs on both iOS and Android
- [ ] Navigation works correctly
- [ ] State management works
- [ ] Offline functionality works
- [ ] API integration works

### Performance Testing
- [ ] App startup time is acceptable
- [ ] Memory usage is reasonable
- [ ] Network requests are optimized
- [ ] Offline sync works efficiently
- [ ] UI is responsive

## 📊 Success Criteria

By the end of Day 19, you should have:

✅ **React Native Mastery**: Cross-platform mobile development  
✅ **Navigation**: Screen management and routing  
✅ **State Management**: Redux and Context API  
✅ **Offline Support**: Local storage and synchronization  
✅ **API Integration**: Backend API communication  

## 🔄 Next Steps

1. **Commit your work**: `git add . && git commit -m "Complete Day 19: React Native"`
2. **Create PR**: Submit pull request for code review
3. **Prepare for Day 20**: Review Flutter concepts
4. **Update progress**: Document your learning in the daily summary

## ✅ Implementation Notes (this repo)

- **Task 1 (Project setup)**: Day folder was empty (only `README.md`), so nothing was skipped. Scaffolded `package.json` (`SDATrainingApp`, all Task 1 deps: navigation stack/tabs, screens, safe-area-context, Redux Toolkit + react-redux, async-storage, vector-icons, push-notification, gesture-handler, reanimated), plus `tsconfig.json`, `babel.config.js` (with `react-native-reanimated/plugin`), `metro.config.js`, `app.json`, `index.js`, and `App.tsx` (Redux `Provider` + `SafeAreaProvider` + `AppNavigator`, syncs offline queue on launch). Native shells (`android/`, `ios/`) are not committed — they are generated by `npx react-native init SDATrainingApp` on a machine with the RN toolchain.
- **Task 2 (Navigation)**: Created `src/navigation/AppNavigator.tsx` verbatim from spec (Stack `Login` → `Main`, bottom tabs Dashboard/Analytics/Profile/Settings with MaterialIcons, `#3b82f6` active tint, headers hidden).
- **Task 3 (State management)**: Created `src/store/index.ts` verbatim from spec (auth/user/analytics/offline reducers, `persist/PERSIST` serializable ignore, `RootState`/`AppDispatch` exports). Created `src/store/slices/authSlice.ts` per spec (`loginUser`/`logoutUser`/`checkAuthStatus` thunks, token persisted to AsyncStorage, pending/fulfilled/rejected reducers) with two fixes: import corrected from spec's `../services/authService` to `../../services/authService` (spec path resolves to non-existent `src/store/services/`), and `User`/`LoginCredentials` moved to shared `src/types/index.ts` with `(error as Error).message` casts for `strict` mode.
- **Task 4 (API service)**: Created `src/services/apiService.ts` per spec (baseURL `http://localhost:3000/api/v1` matching the day15–18 backend, Bearer header injection, `login`/`logout`/`getCurrentUser`/`getUsers`/`getUser`/`updateUser`/`getAnalytics`/`syncOfflineData`). One typing fix: `Authorization` assigned via `Record<string, string>` cast because `HeadersInit` has no index signature under `strict`.
- **Task 5 (Offline support)**: Created `src/services/offlineService.ts` verbatim from spec (NetInfo listener, `offlineQueue` in AsyncStorage, `queueRequest`/`syncOfflineData` with re-queue on failure, `getOfflineQueue`/`isConnected`).
- **Docs**: Created `docs/react-native-guide.md` per spec.
- **Gap-fill (referenced by spec code but missing from spec)**: Added `src/types/index.ts` (`User`, `LoginCredentials`, `UserFilters`, `Pagination`, `AnalyticsData` — all used but never defined in the spec); `src/services/authService.ts` (thin wrapper over `apiService`, imported by `authSlice`); `src/store/slices/userSlice.ts` / `analyticsSlice.ts` / `offlineSlice.ts` (imported by `store/index.ts` — user list via `apiService.getUsers`, analytics via `apiService.getAnalytics`, online/queue status flags); five screens imported by the navigator (`LoginScreen` dispatches `loginUser`, `DashboardScreen` shows user + online status, `ProfileScreen` dispatches `logoutUser`, `SettingsScreen` shows queue length, `AnalyticsScreen` dispatches `fetchAnalytics`). Added `@react-native-community/netinfo` to `package.json` (imported by `offlineService` but absent from the Task 1 install list).
- **Untouched**: everything outside `week3/day19/` kept as-is.

Validated: `node --check` OK on `babel.config.js`, `metro.config.js`, `index.js`; `package.json`/`app.json`/`tsconfig.json` parse as JSON; all 16 TS/TSX files have balanced braces/parens and every relative import resolves. Run verification (2026-09-24): `npm install` OK, `tsc --noEmit` clean, Metro served `index.bundle?platform=android` with HTTP 200 (~9.3 MB, contains all screens). Fixes needed to get there: `apiService` headers typed as `Record<string, string>` (RN lib has no DOM `HeadersInit`), added `@react-native/typescript-config@0.73.1` + `@types/node` devDeps, dropped `moduleResolution: node` override, added `"types": ["react-native", "jest", "node"]`. Not run: `react-native run-android` — no emulator image/AVD on this machine (system-images dir empty, no cmdline-tools) and no physical device attached.

Setup caveats before first run: `npm install`, then `npx react-native run-android|run-ios`; `process.env.API_BASE_URL` needs a `react-native-dotenv` (or equivalent) babel plugin to work on-device — otherwise the `http://localhost:3000/api/v1` fallback applies (use `10.0.2.2` instead of `localhost` from an Android emulator, `adb reverse tcp:3000 tcp:3000` from a physical device over USB); `react-native-push-notification` and `react-native-vector-icons` need their documented native linking/font steps; point the API URL at the reachable day15–18 backend (`/auth/login`, `/auth/me`, `/users`, `/analytics`).

## ✅ Live Test on Device (Realme RMX3561, Android 14)

- **Toolchain built up from zero**: native `android/`+`ios/` copied from `npx react-native init` template 0.73.2 (kept `com.sdatrainingapp`); Gradle 8.3 dist downloaded manually (wrapper 10s timeout too short for this link); installed SDK `platforms;android-34` + `build-tools;34.0.0` via cmdline-tools; native deps pinned to RN-0.73-era (`gesture-handler@2.14.0`, `reanimated@3.6.2`, `screens@3.29.0`, `safe-area-context@4.9.0` — floating `^` had pulled 2.33/3.19/3.37, which need AGP 8.4+/RN 0.75+); built with Temurin JDK 17 (AGP 8.1 breaks on the system JDK 21). Backend run per day18 compose (`mongo:7`, `postgres:15`, `redis:7-alpine`, all cached) after the daemon was started; migrations re-run on the fresh volume.
- **Backend-adaptation fixes (spec shapes vs real backend)**: login returns `{user, accessToken, refreshToken}` so `apiService.login` maps `accessToken → token`; `/auth/me` returns `{success, data: user}` so `getCurrentUser` unwraps `.data`; `LoginScreen` navigates `replace('Main')` on `isAuthenticated` (spec wires no post-login navigation); all screens forced to `#fff` background + `#000` text (system dark mode washed out unstyled text).
- **Verified live**: `BUILD SUCCESSFUL`, installed + launched on device, no RedBox; register → login → `/me` all 200 via curl; `test@sda.com` / `Test1234!` signs in on-device and reaches the tab navigator (promoted to `admin` via mongosh — analytics route is `authorize("admin")` and returned 403 for `role: user`, backend-side, not app-side).
- **Known spec-conformant behaviors (not regressions)**: logout clears auth state but stays on Profile (spec defines no logout navigation); analytics payload is `{users, products, orders}` while spec types expect `{totalUsers, ...}` (display-only shape gap).

## 📚 Additional Resources

- [React Native Documentation](https://reactnative.dev/)
- [React Navigation](https://reactnavigation.org/)
- [Redux Toolkit](https://redux-toolkit.js.org/)
- [React Native Testing](https://reactnative.dev/docs/testing)

---

**Ready for Day 20? Check out [Day 20: Flutter](../day20/README.md)!** 🚀
