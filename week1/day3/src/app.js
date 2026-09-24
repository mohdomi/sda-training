import { DataManager } from "./modules/DataManager.js";
import { PerformanceMonitor } from "./modules/PerformanceMonitor.js";
import { ChartManager } from "./modules/ChartManager.js";

class DashboardApp {
  constructor() {
    this.dataManager = new DataManager("");
    this.chartManager = null;
    this.performanceMonitor = new PerformanceMonitor();
    this.init();
  }

  async init() {
    try {
      await this.setupUI();
      await this.initializeCharts();
      this.setupEventListeners();
      this.startPerformanceMonitoring();
    } catch (error) {
      console.error("App Initialization error : ", error);
      this.showError("Failed to initialize dashboard.");
    }
  }

  async setupUI() {
    const dashboardHTML = `
                <div class="charts-grid">
                    <div class="chart-container">
                        <h3>Revenue Trend</h3>
                        <canvas id="revenueChart"></canvas>
                    </div>
                    <div class="chart-container">
                        <h3>User Growth</h3>
                        <canvas id="userChart"></canvas>
                    </div>
                    <div class="chart-container">
                        <h3>Order Distribution</h3>
                        <canvas id="orderChart"></canvas>
                    </div>
                    <div class="chart-container">
                        <h3>Performance Overview</h3>
                        <canvas id="performanceChart"></canvas>
                    </div>
                </div>
                <div class="performance-panel">
                    <h3>Performance Metrics</h3>
                    <div id="performance-metrics"></div>
                </div>
        `;

    document.querySelector(".content").insertAdjacentHTML('beforeend', dashboardHTML);
  }

  async initializeCharts() {
    this.chartManager = new ChartManager("charts-grid", this.dataManager);
  }

  setupEventListeners() {
    const refreshBtn = document.createElement("button");

    refreshBtn.textContent = "Refresh Data";

    refreshBtn.className = "refresh-btn";

    refreshBtn.addEventListener("click", () => {
      this.refreshData();
    });

    document.querySelector(".content-header").appendChild(refreshBtn);

    const monitorBtn = document.createElement("button");
    monitorBtn.textContent = "Toggle Performance Monitor";
    monitorBtn.addEventListener("click", () => this.togglePerformanceMonitor());
    document.querySelector(".content-header").appendChild(monitorBtn);
  }

  async refreshData() {
    this.dataManager.clearCache();
    await this.chartManager.createCharts();
  }

  togglePerformanceMonitor() {
    const panel = document.querySelector(".performance-panel");
    panel.style.display = panel.style.display === "none" ? "block" : "none";
  }

  startPerformanceMonitoring() {
    this.performanceMonitor.subscribe((metric) => {
      this.updatePerformanceDisplay(metric);
    });
  }

  updatePerformanceDisplay(metric) {

    if(metric.name === 'CLS') return; // i have commented this because it was causing an infinite race condition.

    const container = document.getElementById("performance-metrics");
    if (!container) reutrn;



    const metricElement = document.createElement("div");
    
    metricElement.className = "metric-item";
    metricElement.innerHTML = `
            <span class="metric-name">${metric.name}:</span>
            <span class="metric-value">${metric.value.toFixed(2)}</span>
            <span class="metric-time">${new Date(metric.timestamp).toLocaleTimeString()}</span>
        `;

    container.appendChild(metricElement);

    const items = container.querySelectorAll(".metric-item");
    if (items.length > 10) {
      items[0].remove();
    }
  }

  showError(message) {
    document.querySelector(".content").innerHTML = `
            <div class="error-container">
                <h2>Dashboard Error</h2>
                <p>${message}</p>
                <button onclick="location.reload()">Reload Page</button>
            </div>
        `;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new DashboardApp();
});
