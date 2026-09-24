const { performance } = require("perf_hooks");
// Reuse the single winston pipeline from errorHandler.js (logs/combined.log,
// logs/error.log) instead of creating another logger instance.
const { logger } = require("./errorHandler");

class MonitoringService {
  constructor() {
    this.metrics = new Map();
    this.startTime = Date.now();
  }

  recordRequest(req, res, duration) {
    const metric = {
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      duration,
      timestamp: new Date().toISOString(),
      userAgent: req.get("User-Agent"),
      ip: req.ip,
      userId: req.user ? String(req.user._id || req.user.userId) : undefined,
    };

    logger.info("Request processed", metric);
    this.updateMetrics(metric);
  }

  recordError(error, req) {
    const errorMetric = {
      error: error.message,
      stack: error.stack,
      url: req.originalUrl || req.url,
      method: req.method,
      timestamp: new Date().toISOString(),
      userId: req.user ? String(req.user._id || req.user.userId) : undefined,
    };

    logger.error("Request error", errorMetric);
  }

  updateMetrics(metric) {
    const key = `${metric.method}:${metric.url.split("?")[0]}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        count: 0,
        totalDuration: 0,
        errors: 0,
        lastRequest: null,
      });
    }

    const stats = this.metrics.get(key);
    stats.count++;
    stats.totalDuration += metric.duration;
    stats.lastRequest = metric.timestamp;

    if (metric.statusCode >= 400) {
      stats.errors++;
    }
  }

  getMetrics() {
    const uptime = Date.now() - this.startTime;
    const memoryUsage = process.memoryUsage();

    const requestMetrics = {};
    for (const [key, stats] of this.metrics) {
      requestMetrics[key] = {
        ...stats,
        avgDurationMs:
          stats.count > 0 ? stats.totalDuration / stats.count : 0,
      };
    }

    return {
      uptime,
      memory: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external,
      },
      requestMetrics,
      process: {
        pid: process.pid,
        version: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    };
  }

  getHealthStatus() {
    const metrics = this.getMetrics();
    const memoryUsagePercent =
      (metrics.memory.heapUsed / metrics.memory.heapTotal) * 100;

    return {
      status: memoryUsagePercent > 90 ? "unhealthy" : "healthy",
      uptime: metrics.uptime,
      memoryUsage: memoryUsagePercent,
      requestCount: Array.from(this.metrics.values()).reduce(
        (sum, stat) => sum + stat.count,
        0,
      ),
      errorRate: this.calculateErrorRate(),
    };
  }

  calculateErrorRate() {
    const totalRequests = Array.from(this.metrics.values()).reduce(
      (sum, stat) => sum + stat.count,
      0,
    );
    const totalErrors = Array.from(this.metrics.values()).reduce(
      (sum, stat) => sum + stat.errors,
      0,
    );

    return totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
  }
}

const monitoringService = new MonitoringService();

// Monitoring middleware — records timing + status for every request once the
// response finishes. Mount globally (after body parsing, before routes).
const monitoringMiddleware = (req, res, next) => {
  const start = performance.now();

  res.on("finish", () => {
    const duration = performance.now() - start;
    monitoringService.recordRequest(req, res, duration);
  });

  res.on("error", (error) => {
    monitoringService.recordError(error, req);
  });

  next();
};

// Health check endpoint (public) — enriched with live stats
const healthCheck = (req, res) => {
  const health = monitoringService.getHealthStatus();
  res.json({
    ...health,
    timestamp: new Date().toISOString(),
    version: process.version,
  });
};

// Metrics endpoint (admin-only) — full per-route breakdown
const metrics = (req, res) => {
  const data = monitoringService.getMetrics();
  res.json({ success: true, data });
};

module.exports = {
  monitoringService,
  monitoringMiddleware,
  healthCheck,
  metrics,
};
