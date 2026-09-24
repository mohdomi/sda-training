import { DataManager } from "./DataManager.js";

export class ChartManager {
  constructor(containerId, dataManager) {
    this.container = document.getElementById(containerId);
    this.dataManager = dataManager;
    this.charts = new Map();
    this.init();
  }

  async init() {
    await this.loadChartLibrary(); // this is i guess chart.js loader
    this.setupEventListeners();
    await this.createCharts();
  }

  async loadChartLibrary() {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/chart.js";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async createCharts() {
    try {
      const [userData, revenueData, orderData] = await Promise.all([
        this.dataManager.fetchData("/api/users.json"),
        this.dataManager.fetchData("/api/revenue.json"),
        this.dataManager.fetchData("/api/orders.json"),
      ]);

      this.createLineChart("revenueChart", revenueData);
      this.createBarChart("userChart", userData);
      this.createDoughnutChart("orderChart", orderData);
      this.createMixedChart("performanceChart", {
        userData,
        revenueData,
        orderData,
      });
    } catch (error) {
      console.error("Chart creation error : ", error);
      this.showError("Failed to load chart data");
    }
  }

  createLineChart(canvasId, data) {
    const ctx = document.getElementById(canvasId).getContext("2d");

    this.charts.set(
      canvasId,
      new Chart(ctx, {
        type: "line",
        data: {
          labels: data.labels,
          datasets: [
            {
              label: "Revenue",
              data: data.values,
              borderColor: "rgb(59, 130, 246)",
              backgroundColor: "rgba(59, 130, 246, 0.1)",
              tension: 0.4,
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false,
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: "rgba(0, 0, 0, 0.1)",
              },
            },
            x: {
              grid: {
                display: false,
              },
            },
          },
          animation: {
            duration: 2000,
            easing: "easeInOutQuart",
          },
        },
      }),
    );
  }

  createBarChart(canvasId, data) {
    const ctx = document.getElementById(canvasId).getContext("2d");
    his.charts.set(
      canvasId,
      new Chart(ctx, {
        type: "bar",
        data: {
          labels: data.labels,
          datasets: [
            {
              label: "Users",
              data: data.values,
              backgroundColor: "rgba(16, 185, 129, 0.8)",
              borderColor: "rgb(16, 185, 129)",
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false,
            },
          },
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        },
      }),
    );
  }

  createDoughnutChart(canvasId, data) {
    const ctx = document.getElementById(canvasId).getContext("2d");

    this.charts.set(
      canvasId,
      new Chart(ctx, {
        type: "doughnut",
        data: {
          labels: data.labels,
          datasets: [
            {
              data: data.values,
              backgroundColor: [
                "rgba(59, 130, 246, 0.8)",
                "rgba(16, 185, 129, 0.8)",
                "rgba(245, 158, 11, 0.8)",
                "rgba(239, 68, 68, 0.8)",
              ],
              borderWidth: 2,
              borderColor: "#fff",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
            },
          },
        },
      }),
    );
  }

  createMixedChart(canvasId, data) {
    const ctx = document.getElementById(canvasId).getContext("2d");

    this.charts.set(
      canvasId,
      new Chart(ctx, {
        type: "line",
        data: {
          labels: data.userData.labels,
          datasets: [
            {
              label: "Users",
              data: data.userData.values,
              type: "bar",
              backgroundColor: "rgba(59, 130, 246, 0.6)",
              borderColor: "rgb(59, 130, 246)",
              yAxisID: "y",
            },
            {
              label: "Revenue",
              data: data.revenueData.values,
              type: "line",
              borderColor: "rgb(16, 185, 129)",
              backgroundColor: "rgba(16, 185, 129, 0.1)",
              tension: 0.4,
              yAxisID: "y1",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              type: "linear",
              display: true,
              position: "left",
            },
            y1: {
              type: "linear",
              display: true,
              position: "right",
              grid: {
                drawOnChartArea: false,
              },
            },
          },
        },
      }),
    );
  }

  setupEventListeners() {
    this.dataManager.subscribe((endpoint, data) => {
      this.updateCharts(endpoint, data);
    });

    window.addEventListener(
      "resize",
      this.debounce(() => {
        this.charts.forEach((chart) => chart.resize());
      }, 250),
    );
  }

  updateCharts(endpoint, data) {
    switch (endpoint) {
      case "/api/users":
        this.updateChart("userChart", data);
        break;
      case "/api/revenue":
        this.updateChart("revenueChart", data);
        break;
      case "/api/orders":
        this.updateChart("orderChart", data);
        break;
    }
  }

  updateChart(chartId, data) {
    const chart = this.charts.get(chartId);
    if (chart) {
      chart.data = data;
      chart.update("active");
    }
  }

  showError(message) {
    this.container.innerHTML = `
            <div class="error-message">
                <h3>Error Loading Charts</h3>
                <p>${message}</p>
                <button onclick="location.reload()">Retry</button>
            </div>
        `;
  }
  
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      clearTimeout(timeout);
      setTimeout(() => {
        clearTimeout(timeout);
        func(...args);
      }, wait);
    };
  }
}
