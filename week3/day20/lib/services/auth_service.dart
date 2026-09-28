import '../models/user.dart';
import 'api_service.dart';

class AuthService {
  final ApiService _apiService = ApiService();

  Future<AuthResponse> login(String email, String password) {
    return _apiService.login(email, password);
  }

  Future<void> logout() {
    return _apiService.logout();
  }

  Future<User> getCurrentUser() {
    return _apiService.getCurrentUser();
  }
}
