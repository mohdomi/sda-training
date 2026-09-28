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
