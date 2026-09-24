import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User, UserFilters, Pagination, AnalyticsData } from '../types';

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
      (headers as Record<string, string>).Authorization = `Bearer ${this.token}`;
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

  async getAnalytics(timeRange: string = '30d') {
    return this.request<{
      success: boolean;
      data: AnalyticsData;
    }>(`/analytics?timeRange=${timeRange}`);
  }

  async syncOfflineData() {
    const offlineData = await AsyncStorage.getItem('offlineData');
    if (offlineData) {
      const data = JSON.parse(offlineData);
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
