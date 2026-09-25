import { apiService } from './apiService';
import type { LoginCredentials, User } from '../types';

class AuthService {
  async login(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
    return apiService.login(credentials);
  }

  async logout(): Promise<void> {
    return apiService.logout();
  }

  async getCurrentUser(): Promise<User> {
    return apiService.getCurrentUser();
  }
}

export const authService = new AuthService();
