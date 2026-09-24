export class PerformanceMonitor {
  constructor() {
    this.observers = new Set();
    this.metrics = new Map();
    this.init();
  }

  init() {
    this.observePerformance();
    this.observeMemory();
    this.observeUserInteractions();
  }

  observePerformance() {
    if ("PerformanceObserver" in window) {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.recordMetric("LCP", lastEntry.startTime);
      }).observe({ entryTypes: ["largest-contentful-paint"] });

      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          this.recordMetric("FID", entry.processingStart - entry.startTime);
        });
      }).observe({ entryTypes: ["first-input"] });

      new PerformanceObserver((list) => {
        const entries = list.getEntries();

        entries.forEach((entry) => {
          if (!entry.hadRecentInput) {
            this.recordMetric("CLS", entry.value);
          }
        });
      }).observe({ entryTypes: ["layout-shift"] });
    }
  }

  observeMemory() {
    if ("memory" in performance) {
      setInterval(() => {
        const memory = performance.memory;
        this.recordMetric("memory-used", memory.usedJSHeapSize);
        this.recordMetric("memory-total", memory.totalJSHeapSize);
        this.recordMetric("memory-limit", memory.jsHeapSizeLimit);
      }, 5000);
    }
  }

  observeUserInteractions() {
    let interactionCount = 0;

    ["click", "keydown", "scroll", "touchstart"].forEach((eventType) => {
      document.addEventListener(
        eventType,
        () => {
          interactionCount++;
          this.recordMetric("interaction-count", interactionCount);
        },
        { passive: true },
      );
    });
  }

  recordMetric(name, value) {
    const timestamp = Date.now();
    const metric = { name, value, timestamp };
    this.metrics.set(name, metric);
    this.notifyObservers(metric);
    this.storeMetric(metric);
  }

  getMetric(name) {
    return this.metrics.get(name);
  }

  getAllMetrics() {
    return Array.from(this.metrics.values());
  }

  subscribe(callback) {
    this.observers.add(callback);
    return () => this.observers.delete(callback);
  }

  notifyObservers(metric) {
    this.observers.forEach((callback) => callback(metric));
  }

  storeMetric(metric) {
    const stored = JSON.parse(
      localStorage.getItem("performance-metric") || "[]",
    );

    stored.push(metric);

    if (stored.length > 100) {
      stored.splice(0, stored.length - 100);
    }

    localStorage.setItem("performance-metric", JSON.stringify(stored));
  }

  getStoredMetrics() {
    return JSON.parse(localStorage.getItem('performance-metrics') || '[]');
  }

  generateReport() {

    const metrics = this.getAllMetrics();

    const report = {
        timestamp : Date.now(),
        metrics : metrics,
        summary : this.generateSummary(metrics)
    }

    return report;

  }


  generateSummary(metrics){ 

    const summary = {};

    metrics.forEach(metric => {

        if(!summary[metric.name]){
            summary[metric.name]=  {
                count : 0,
                total : 0,
                average : 0,
                min : Infinity,
                max : -Infinity
            }
        }

        const stat = summary[metric.name];
        
        stat.count++;
        stat.total += metric.value;
        stat.average = stat.total / stat.count;
        stat.min = Math.min(stat.min, metric.value);
        stat.max = Math.max(stat.max, metric.value);
    });

    return summary;

  }

}
