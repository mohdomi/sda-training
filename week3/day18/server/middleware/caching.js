const redis = require("redis");
const { logger } = require("./errorHandler.js");

class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.client = redis.createClient({
        url: process.env.REDIS_URL || "redis://localhost:6379",
        retry_strategy: (options) => {
          if (options.error && options.error.code === "ECONNREFUSED") {
            return new Error("Redis server connection refused");
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            return new Error("Retry time exhausted");
          }
          if (options.attempt > 10) {
            return undefined;
          }
          return Math.min(options.attempt * 100, 3000);
        },
      });

      this.client.on("connect", () => {
        this.isConnected = true;
        logger.info("Redis connected successfully");
      });

      this.client.on("error", (err) => {
        this.isConnected = false;
        logger.error("Redis connection error : ", err);
      });

      await this.client.connect();
    } catch (error) {
      logger.error("Redis connection failed : ", error);
      throw error;
    }
  }

  async get(key) {
    try {
      if (!this.isConnected) return null;

      const value = await this.client.get(key);

      return value ? JSON.parse(value) : null;
    } catch (err) {
      logger.error("Redis get error : ", err);
      return null;
    }
  }

  async set(key, value, ttl = 3600) {
    try {
      if (!this.isConnected) return false;

      await this.client.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (err) {
      logger.error("Redis set error: ", err);
      return false;
    }
  }

  async del(key) {
    try {
      if (!this.isConnected) return false;

      await this.client.del(key);
      return true;
    } catch (err) {
      logger.error("Redis del error : ", err);

      return false;
    }
  }

  async flush() {
    try {
      if (!this.isConnected) return false;

      await this.client.flushAll();
      return true;
    } catch (err) {
      logger.error("Redis flushAll error : ", err);

      return false;
    }
  }

  generateKey(prefix, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}:${params[key]}`)
      .join("|");

    return `${prefix}:${sortedParams}`;
  }
}

const cacheService = new CacheService();

const cache = (ttl = 3600, keyGenerator = null) => {
  return async (req, res, next) => {
    try {
      const cacheKey = keyGenerator
        ? keyGenerator(req)
        : cacheService.generateKey(req.path, req.query);

      const cachedData = await cacheService.get(cacheKey);

      if (cachedData) {
        res.set("X-Cache", "HIT");
        return res.json(cachedData);
      }

      const originalJson = res.json;

      res.json = function (data) {
        cacheService.set(cacheKey, data, ttl);
        res.set("X-Cache", "MISS");
        return originalJson.call(this, data);
      };


      next();
    } catch (error) {
      logger.error("Cache middleware error : ", error);
      next();
    }
  };
};

module.exports = { cacheService, cache };
