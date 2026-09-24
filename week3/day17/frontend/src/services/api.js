// Central API client for the Day 14 dashboard.
// Backend reality: users/auth in MongoDB at /auth/*, products/orders in
// PostgreSQL, notifications in MongoDB. All ids are opaque strings
// (Mongo ObjectId for users/notifications, UUID for products/orders).
class ApiService {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";
    this.accessToken = localStorage.getItem("accessToken");
    this.refreshToken = localStorage.getItem("refreshToken");
  }

  setTokens({ accessToken, refreshToken }) {
    if (accessToken) {
      this.accessToken = accessToken;
      localStorage.setItem("accessToken", accessToken);
    }
    if (refreshToken) {
      this.refreshToken = refreshToken;
      localStorage.setItem("refreshToken", refreshToken);
    }
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
  }

  async request(endpoint, options = {}, retry = true) {
    const url = `${this.baseURL}${endpoint}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {}),
        ...options.headers,
      },
    });
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    if (res.status === 401 && retry && this.refreshToken && !endpoint.startsWith("/auth/")) {
      try {
        await this.refresh();
        return this.request(endpoint, options, false);
      } catch {
        this.clearTokens();
        window.location.href = "/login";
        throw new Error("Session expired, please log in again");
      }
    }
    if (!res.ok) {
      throw new Error(data?.error?.message || data?.message || "Request failed");
    }
    return data;
  }

  // ---- Auth (MongoDB) ----
  async register(payload) {
    const res = await this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (res.data?.accessToken) {
      this.setTokens(res.data);
      localStorage.setItem("user", JSON.stringify(res.data.user));
    }
    return res;
  }

  async login(credentials) {
    const res = await this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    if (res.data?.accessToken) {
      this.setTokens(res.data);
      localStorage.setItem("user", JSON.stringify(res.data.user));
    }
    return res;
  }

  async refresh() {
    const res = await this.request(
      "/auth/refresh",
      { method: "POST", body: JSON.stringify({ refreshToken: this.refreshToken }) },
      false,
    );
    // refresh endpoint returns { data: { accessToken, refreshToken } }
    this.setTokens(res.data);
    return res;
  }

  async logout() {
    try {
      await this.request("/auth/logout", { method: "POST" });
    } catch {
      // ignore — logout is client-side token discard
    }
    this.clearTokens();
  }

  async getMe() {
    return this.request("/auth/me");
  }

  // ---- Users (MongoDB, admin) ----
  async getUsers(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request(`/users${q ? `?${q}` : ""}`);
  }

  async getUser(id) {
    return this.request(`/users/${id}`);
  }

  async updateUser(id, data) {
    return this.request(`/users/${id}`, { method: "PUT", body: JSON.stringify(data) });
  }

  async deleteUser(id) {
    return this.request(`/users/${id}`, { method: "DELETE" });
  }

  // ---- Products (PostgreSQL, public reads) ----
  async getProducts(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request(`/products${q ? `?${q}` : ""}`);
  }

  async getProduct(id) {
    return this.request(`/products/${id}`);
  }

  async createProduct(data) {
    return this.request("/products", { method: "POST", body: JSON.stringify(data) });
  }

  async updateProduct(id, data) {
    return this.request(`/products/${id}`, { method: "PUT", body: JSON.stringify(data) });
  }

  async deleteProduct(id) {
    return this.request(`/products/${id}`, { method: "DELETE" });
  }

  // ---- Orders (PostgreSQL) ----
  async getMyOrders() {
    return this.request("/orders/my");
  }

  async getOrders(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request(`/orders${q ? `?${q}` : ""}`);
  }

  async getOrder(id) {
    return this.request(`/orders/${id}`);
  }

  async createOrder(data) {
    return this.request("/orders", { method: "POST", body: JSON.stringify(data) });
  }

  async updateOrderStatus(id, status) {
    return this.request(`/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  }

  async cancelOrder(id) {
    return this.request(`/orders/${id}`, { method: "DELETE" });
  }

  // ---- Analytics (admin; Mongo counts + PG counts) ----
  async getAnalytics() {
    return this.request("/analytics");
  }

  // ---- Health ----
  async getHealth() {
    const url = this.baseURL.replace(/\/api\/v1$/, "");
    const res = await fetch(`${url}/health`);
    if (!res.ok) throw new Error("Health check failed");
    return res.json();
  }

  // ---- Notifications (MongoDB) ----
  async getMyNotifications() {
    return this.request("/notifications/my");
  }

  async markNotificationRead(id) {
    return this.request(`/notifications/${id}/read`, { method: "PATCH" });
  }
}

export default new ApiService();
