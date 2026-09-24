export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface UserFilters {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AnalyticsData {
  totalUsers: number;
  activeUsers: number;
  totalOrders: number;
  revenue: number;
  chartData: Array<{ label: string; value: number }>;
}
