const performance = require("perf_hooks");

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.startTime = Date.now();
  }

  startTimer(name) {
    const timer = performance.performance.now();
    this.metrics.set(name, { start: timer });
  }

  endTimer(name) {
    const timer = this.metrics.get(name);

    if (timer) {
      const duration = performance.performance.now() - timer.start;
      this.metrics.set(name, {
        ...timer,
        duration,
        end: performance.performance.now(),
      });
      return duration;
    }
    return null;
  }

  getMetrics() {
    const uptime = Date.now() - this.startTime;
    const memoryUsage = process.memoryUsage();

    return {
      uptime,
      memory: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external,
      },
      timers: Object.fromEntries(this.metrics),
      process: {
        pid: process.pid,
        version: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    };
  }

  reset() {
    this.metrics.clear();
    this.startTime = Date.now();
  }
}

const performanceMonitor = new PerformanceMonitor();
const performanceMiddleware = (req, res, next) => {
  const startTime = performance.performance.now();

  res.on("finish", () => {
    const duration = performance.performance.now() - startTime;
    const memoryUsage = process.memoryUsage();

    console.log({
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration.toFixed(2)}ms`,
      memory: {
        heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
      },
      timestamp: new Date().toISOString(),
    });
  });

  next();
};

module.exports = {
  performanceMiddleware,
  performanceMonitor,
};
