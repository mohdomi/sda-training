# Day 20: Flutter

## 🎯 Learning Objectives

- Master Flutter development and Dart programming
- Implement widgets, navigation, and state management
- Build responsive mobile UI with Material Design
- Create offline functionality and local storage
- Integrate with backend APIs and real-time data

## 📚 Theory & Concepts

### Flutter Fundamentals
- **Widgets**: Building blocks of Flutter apps
- **State Management**: Provider, Bloc, or Riverpod
- **Navigation**: Screen management and routing
- **Styling**: Material Design and custom themes
- **Platform Integration**: iOS and Android specific features

### Dart Programming
- **Language Features**: Modern Dart language features
- **Async Programming**: Futures, Streams, and async/await
- **Error Handling**: Exception handling and debugging
- **Performance**: Optimizing Dart code
- **Testing**: Unit and widget testing

### Best Practices
- **Widget Composition**: Reusable widget design
- **Performance**: Optimizing Flutter apps
- **State Management**: Choosing the right solution
- **Architecture**: Clean architecture patterns
- **Testing**: Comprehensive testing strategies

## 🛠️ Hands-on Tasks

### Task 1: Create Flutter Project
Set up comprehensive Flutter application:

```bash
# Create new Flutter project
flutter create sda_training_app
cd sda_training_app

# Add dependencies to pubspec.yaml
flutter pub add provider
flutter pub add http
flutter pub add shared_preferences
flutter pub add connectivity_plus
flutter pub add dio
flutter pub add flutter_local_notifications
flutter pub add cached_network_image
flutter pub add flutter_svg
```

```yaml
# pubspec.yaml
name: sda_training_app
description: SDA Training Flutter Application

publish_to: 'none'

version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  
  # State Management
  provider: ^6.0.5
  
  # HTTP Client
  dio: ^5.3.2
  
  # Local Storage
  shared_preferences: ^2.2.2
  
  # Network
  connectivity_plus: ^5.0.2
  
  # Notifications
  flutter_local_notifications: ^16.3.0
  
  # UI
  cached_network_image: ^3.3.0
  flutter_svg: ^2.0.9
  
  # Utils
  intl: ^0.18.1
  logger: ^2.0.2

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0

flutter:
  uses-material-design: true
  
  assets:
    - assets/images/
    - assets/icons/
  
  fonts:
    - family: Roboto
      fonts:
        - asset: fonts/Roboto-Regular.ttf
        - asset: fonts/Roboto-Bold.ttf
          weight: 700
```

### Task 2: Implement State Management
Create comprehensive state management with Provider:

```dart
// lib/providers/auth_provider.dart
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/auth_service.dart';
import '../models/user.dart';

class AuthProvider with ChangeNotifier {
  final AuthService _authService = AuthService();
  
  User? _user;
  String? _token;
  bool _isLoading = false;
  String? _error;

  User? get user => _user;
  String? get token => _token;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isAuthenticated => _user != null && _token != null;

  Future<void> login(String email, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _authService.login(email, password);
      _user = response.user;
      _token = response.token;
      
      // Save token to local storage
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('auth_token', _token!);
      
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    _user = null;
    _token = null;
    
    // Remove token from local storage
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    
    notifyListeners();
  }

  Future<void> checkAuthStatus() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('auth_token');
    
    if (token != null) {
      try {
        final user = await _authService.getCurrentUser();
        _user = user;
        _token = token;
        notifyListeners();
      } catch (e) {
        // Token is invalid, remove it
        await prefs.remove('auth_token');
      }
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
```

```dart
// lib/providers/analytics_provider.dart
import 'package:flutter/foundation.dart';
import '../services/analytics_service.dart';
import '../models/analytics.dart';

class AnalyticsProvider with ChangeNotifier {
  final AnalyticsService _analyticsService = AnalyticsService();
  
  AnalyticsData? _analyticsData;
  bool _isLoading = false;
  String? _error;
  String _selectedTimeRange = '30d';

  AnalyticsData? get analyticsData => _analyticsData;
  bool get isLoading => _isLoading;
  String? get error => _error;
  String get selectedTimeRange => _selectedTimeRange;

  Future<void> fetchAnalytics({String? timeRange}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final timeRangeToUse = timeRange ?? _selectedTimeRange;
      _analyticsData = await _analyticsService.getAnalytics(timeRangeToUse);
      _selectedTimeRange = timeRangeToUse;
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  void setTimeRange(String timeRange) {
    _selectedTimeRange = timeRange;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
```

### Task 3: Create API Service
Implement comprehensive API service:

```dart
// lib/services/api_service.dart
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user.dart';
import '../models/analytics.dart';

class ApiService {
  static const String baseUrl = 'http://localhost:3000/api/v1';
  late Dio _dio;

  ApiService() {
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final prefs = await SharedPreferences.getInstance();
        final token = prefs.getString('auth_token');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) {
        if (error.response?.statusCode == 401) {
          // Handle unauthorized access
          _handleUnauthorized();
        }
        handler.next(error);
      },
    ));
  }

  void _handleUnauthorized() {
    // Clear token and redirect to login
    SharedPreferences.getInstance().then((prefs) {
      prefs.remove('auth_token');
    });
  }

  // Authentication methods
  Future<AuthResponse> login(String email, String password) async {
    try {
      final response = await _dio.post('/auth/login', data: {
        'email': email,
        'password': password,
      });
      
      return AuthResponse.fromJson(response.data);
    } catch (e) {
      throw Exception('Login failed: ${e.toString()}');
    }
  }

  Future<void> logout() async {
    try {
      await _dio.post('/auth/logout');
    } catch (e) {
      // Logout even if API call fails
    }
  }

  Future<User> getCurrentUser() async {
    try {
      final response = await _dio.get('/auth/me');
      return User.fromJson(response.data['data']);
    } catch (e) {
      throw Exception('Failed to get current user: ${e.toString()}');
    }
  }

  // User methods
  Future<List<User>> getUsers({Map<String, dynamic>? filters}) async {
    try {
      final response = await _dio.get('/users', queryParameters: filters);
      final List<dynamic> usersJson = response.data['data']['users'];
      return usersJson.map((json) => User.fromJson(json)).toList();
    } catch (e) {
      throw Exception('Failed to get users: ${e.toString()}');
    }
  }

  Future<User> getUser(String id) async {
    try {
      final response = await _dio.get('/users/$id');
      return User.fromJson(response.data['data']);
    } catch (e) {
      throw Exception('Failed to get user: ${e.toString()}');
    }
  }

  Future<User> updateUser(String id, Map<String, dynamic> data) async {
    try {
      final response = await _dio.put('/users/$id', data: data);
      return User.fromJson(response.data['data']);
    } catch (e) {
      throw Exception('Failed to update user: ${e.toString()}');
    }
  }

  // Analytics methods
  Future<AnalyticsData> getAnalytics(String timeRange) async {
    try {
      final response = await _dio.get('/analytics', queryParameters: {
        'timeRange': timeRange,
      });
      return AnalyticsData.fromJson(response.data['data']);
    } catch (e) {
      throw Exception('Failed to get analytics: ${e.toString()}');
    }
  }
}
```

### Task 4: Create Offline Support
Implement comprehensive offline functionality:

```dart
// lib/services/offline_service.dart
import 'package:shared_preferences/shared_preferences.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'dart:convert';
import '../models/offline_action.dart';

class OfflineService {
  static const String _offlineQueueKey = 'offline_queue';
  static const String _offlineDataKey = 'offline_data';
  
  final Connectivity _connectivity = Connectivity();
  bool _isOnline = true;
  List<OfflineAction> _offlineQueue = [];

  OfflineService() {
    _initializeConnectivityListener();
    _loadOfflineQueue();
  }

  void _initializeConnectivityListener() {
    _connectivity.onConnectivityChanged.listen((ConnectivityResult result) {
      _isOnline = result != ConnectivityResult.none;
      
      if (_isOnline) {
        _syncOfflineData();
      }
    });
  }

  Future<void> _loadOfflineQueue() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final queueJson = prefs.getString(_offlineQueueKey);
      
      if (queueJson != null) {
        final List<dynamic> queueList = json.decode(queueJson);
        _offlineQueue = queueList.map((json) => OfflineAction.fromJson(json)).toList();
      }
    } catch (e) {
      print('Failed to load offline queue: $e');
    }
  }

  Future<void> _saveOfflineQueue() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final queueJson = json.encode(_offlineQueue.map((action) => action.toJson()).toList());
      await prefs.setString(_offlineQueueKey, queueJson);
    } catch (e) {
      print('Failed to save offline queue: $e');
    }
  }

  Future<void> queueRequest(String endpoint, String method, Map<String, dynamic> data) async {
    final action = OfflineAction(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      endpoint: endpoint,
      method: method,
      data: data,
      timestamp: DateTime.now(),
    );

    _offlineQueue.add(action);
    await _saveOfflineQueue();
  }

  Future<void> _syncOfflineData() async {
    if (!_isOnline || _offlineQueue.isEmpty) {
      return;
    }

    final queue = List<OfflineAction>.from(_offlineQueue);
    _offlineQueue.clear();
    await _saveOfflineQueue();

    for (final action in queue) {
      try {
        await _syncRequest(action);
      } catch (e) {
        print('Failed to sync request: $e');
        // Re-queue failed requests
        _offlineQueue.add(action);
      }
    }

    await _saveOfflineQueue();
  }

  Future<void> _syncRequest(OfflineAction action) async {
    // Implement actual sync logic here
    // This would typically make the API call
    print('Syncing offline request: ${action.endpoint}');
  }

  List<OfflineAction> getOfflineQueue() => _offlineQueue;
  bool get isOnline => _isOnline;
}
```

### Task 5: Create Main App Structure
Implement comprehensive app structure:

```dart
// lib/main.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/auth_provider.dart';
import 'providers/analytics_provider.dart';
import 'services/offline_service.dart';
import 'screens/splash_screen.dart';
import 'screens/login_screen.dart';
import 'screens/main_screen.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => AnalyticsProvider()),
        Provider(create: (_) => OfflineService()),
      ],
      child: MaterialApp(
        title: 'SDA Training App',
        theme: ThemeData(
          primarySwatch: Colors.blue,
          visualDensity: VisualDensity.adaptivePlatformDensity,
          appBarTheme: const AppBarTheme(
            elevation: 0,
            centerTitle: true,
          ),
        ),
        home: const SplashScreen(),
        routes: {
          '/login': (context) => const LoginScreen(),
          '/main': (context) => const MainScreen(),
        },
      ),
    );
  }
}
```

```dart
// lib/screens/main_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/analytics_provider.dart';
import 'dashboard_screen.dart';
import 'analytics_screen.dart';
import 'profile_screen.dart';
import 'settings_screen.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _currentIndex = 0;

  final List<Widget> _screens = [
    const DashboardScreen(),
    const AnalyticsScreen(),
    const ProfileScreen(),
    const SettingsScreen(),
  ];

  @override
  void initState() {
    super.initState();
    // Load analytics data when main screen is initialized
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AnalyticsProvider>().fetchAnalytics();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _screens[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
        type: BottomNavigationBarType.fixed,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.dashboard),
            label: 'Dashboard',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.analytics),
            label: 'Analytics',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person),
            label: 'Profile',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.settings),
            label: 'Settings',
          ),
        ],
      ),
    );
  }
}
```

## 📝 Documentation Tasks

### Create Flutter Guide
Create `week3/day20/docs/flutter-guide.md`:

```markdown
# Flutter Guide

## Mobile Development
- **Cross-Platform**: iOS and Android development
- **Widgets**: Building blocks of Flutter apps
- **State Management**: Provider, Bloc, or Riverpod
- **Navigation**: Screen management and routing
- **Performance**: Flutter app optimization

## Best Practices
- **Widget Composition**: Reusable widget design
- **Performance**: Optimizing Flutter apps
- **State Management**: Choosing the right solution
- **Architecture**: Clean architecture patterns
- **Testing**: Comprehensive testing strategies
```

## 🧪 Testing & Validation

### Flutter Testing
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

By the end of Day 20, you should have:

✅ **Flutter Mastery**: Cross-platform mobile development  
✅ **Widget System**: Flutter widget architecture  
✅ **State Management**: Provider and state management  
✅ **Offline Support**: Local storage and synchronization  
✅ **API Integration**: Backend API communication  

## 🔄 Next Steps

1. **Commit your work**: `git add . && git commit -m "Complete Day 20: Flutter"`
2. **Create PR**: Submit pull request for code review
3. **Prepare for Day 21**: Review API integration concepts
4. **Update progress**: Document your learning in the daily summary

## ✅ Implementation Notes (this repo)

- **Task 1 (Project setup)**: Day folder was empty (only `README.md`), so nothing was skipped. Scaffolded Flutter project root at `week3/day20/` (`sda_training_app`, spec `pubspec.yaml` verbatim: provider, dio, shared_preferences, connectivity_plus, flutter_local_notifications, cached_network_image, flutter_svg, intl, logger), plus `analysis_options.yaml` (flutter_lints, plus the `build/**` + `android/**` excludes `flutter pub get` adds), `.gitignore` (standard Flutter, minus the `fonts/*.ttf` rule so the Apache-licensed Roboto files commit), `assets/images/` + `assets/icons/` placeholders, and `fonts/Roboto-Regular.ttf` + `fonts/Roboto-Bold.ttf`. Native shells generated via `flutter create --platforms=android --project-name sda_training_app --org com.sdatrainingapp .` and `android/` is committed (same pattern as day19); `lib/`, `pubspec.yaml`, and `test/` verified byte-identical before/after generation. No `ios/` runner (Linux host, physical Android target).
- **Task 2 (State management)**: Created `lib/providers/auth_provider.dart` and `lib/providers/analytics_provider.dart` verbatim from spec (ChangeNotifier, login/logout/checkAuthStatus with `auth_token` in SharedPreferences; fetchAnalytics with `30d` default + setTimeRange/clearError).
- **Task 3 (API service)**: Created `lib/services/api_service.dart` verbatim from spec (Dio, baseUrl `http://localhost:3000/api/v1` matching the day15–18 backend, Bearer interceptor, 401 token-clear, login/logout/getCurrentUser/getUsers/getUser/updateUser/getAnalytics).
- **Task 4 (Offline support)**: Created `lib/services/offline_service.dart` verbatim from spec (Connectivity listener, `offline_queue` in SharedPreferences, queueRequest/_syncOfflineData with re-queue on failure, getOfflineQueue/isOnline).
- **Task 5 (App structure)**: Created `lib/main.dart` and `lib/screens/main_screen.dart` verbatim from spec (MultiProvider Auth+Analytics+OfflineService, MaterialApp with Splash home + /login + /main routes, BottomNavigationBar Dashboard/Analytics/Profile/Settings, analytics fetch on init).
- **Docs**: Created `docs/flutter-guide.md` per spec.
- **Gap-fill (referenced by spec code but missing from spec)**: Added `lib/models/user.dart` (`User` + `AuthResponse`, `_id`→`id` mapping, `token ?? accessToken` so the real day17 backend shape works); `lib/models/analytics.dart` (`AnalyticsData`, tolerant of backend `{users, products, orders}` shape); `lib/models/offline_action.dart` (`OfflineAction` with toJson/fromJson); `lib/services/auth_service.dart` + `lib/services/analytics_service.dart` (thin wrappers over `ApiService`, imported by the providers); six screens imported by `main.dart`/`main_screen.dart` but never defined in the spec (`splash_screen` checks auth status and routes to /login or /main, `login_screen` validates email/password and dispatches `login`, `dashboard_screen` shows user + online status, `analytics_screen` shows time-range dropdown + metrics, `profile_screen` shows user + logout, `settings_screen` shows queue length); `test/widget_test.dart` (MyApp boots). Added `connectivity_plus` listener API as specified.
- **Untouched**: everything outside `week3/day20/` kept as-is.

Validated: `pubspec.yaml` parses as YAML; all 17 Dart files have balanced braces/parens and every relative import resolves. Toolchain (Flutter 3.47.5 stable, Dart 3.13.4, Temurin JDK 17 from the Gradle cache, Android SDK android-34): `flutter pub get` OK (99 dependencies), `flutter analyze` reports 0 errors (6 remaining notes are all verbatim spec code — unused import/field and `print` calls, kept intentionally), `flutter test` passes (`test/widget_test.dart`, `find.byType` — the legacy `findByType` top-level was removed in current Flutter). Pure-Dart models validated against the live day18 backend JSON (11/11 checks: `AuthResponse` maps `accessToken → token`, `User` handles `id`/`_id`, `AnalyticsData` handles the backend `{users, products, orders}` shape, `OfflineAction` JSON round-trip). Deferred to a future session: `flutter build apk` / install / on-device run (Gradle was still downloading the NDK when the session ended; device disconnected and the dev backend went down afterwards — see Additional Notes in `PR_DESCRIPTION/day20.txt`).

Setup caveats before first run: install Flutter SDK (3.47.5 used here), then `flutter pub get`; all declared assets and fonts are committed, and `android/` runners are committed — no `flutter create` needed on a fresh clone. Point `ApiService.baseUrl` at the reachable day15–18 backend (`/auth/login`, `/auth/me`, `/users`, `/analytics` — use `10.0.2.2` instead of `localhost` from an Android emulator, `adb reverse tcp:3000 tcp:3000` from a physical device over USB). Gradle build needs JDK 17 (AGP breaks on JDK 21; a cached Temurin 17 was used here).

## 📚 Additional Resources

- [Flutter Documentation](https://flutter.dev/docs)
- [Dart Language](https://dart.dev/guides)
- [Flutter State Management](https://flutter.dev/docs/development/data-and-backend/state-mgmt)
- [Flutter Testing](https://flutter.dev/docs/testing)

---

**Ready for Day 21? Check out [Day 21: API Integration](../day21/README.md)!** 🚀
