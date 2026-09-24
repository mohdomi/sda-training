class ApiService {
  constructor(baseURL, options = {}) {
    this.baseURL = baseURL;
    this.cache = new Map();
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.timeout = options.timeout || 10000;
    this.subscribers = new Set();
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const cacheKey = `${url}-${JSON.stringify(options)}`;

    if (options.cache !== false && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < (options.cacheTTL || 3000000)) {
        return cached.data;
      }
    }

    const config = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      timeout: this.timeout,
      ...options,
    };

    try {
      const response = await this.fetchWithRetry(url, config);
      const data = await response.json();

      if (options.cache !== false) {
        this.cache.set(cacheKey, {
          data,
          timestamp: Date.now(),
        });
      }

      return data;
    } catch (err) {
      console.error("API request failed : ", err);
      throw err;
    }
  }

  async fetchWithRetry(url, config, attempt = 1) {
    try {
      const controller = new AbortController(); // this basically cancels a request.
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status : ${response.status}`);
      }

      return response;
    } catch (err) {
      if (attempt < this.retryAttempts && this.shouldRetry(err)) {
        await this.delay(this.retryDelay * Math.pow(2, attempt - 1)); // waiting function or delays the request retries
        return this.fetchWithRetry(url, config, attempt + 1);
      }
      throw err;
    }
  }

  shouldRetry(error) {
    return (
      error.name === "AbortError" ||
      error.message.includes("500") ||
      error.message.includes("502") ||
      error.message.includes("503")
    );
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: "GET" });
  }

  async post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: "DELETE" });
  }

  clearCache() {
    this.cache.clear();
  }

  getCacheSize() {
    return this.cache.size;
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notifySubscribers(event, data) {
    this.subscribers.forEach((callback) => callback(event, data));
  }
}

export default ApiService;
