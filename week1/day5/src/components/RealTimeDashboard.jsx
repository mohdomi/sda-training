import React, { useState, useEffect } from "react";

import { useRealTimeData } from "../hooks/useRealTimeData";
import { MetricsCard } from "./MetricsCard";
import { ChartContainer } from "./ChartContainer";
import { ConnectionStatus } from "./ConnectionStatus";
import "./RealTimeDashboard.css";

export function RealTimeDashboard() {
  const [selectedMetric, setSelectedMetric] = useState("revenue");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const sum = (values) =>
    Array.isArray(values) ? values.reduce((a, b) => a + b, 0) : 0;

  const {
    data: revenueData,
    loading: revenueLoading,
    error: revenueError,
    isConnected: revenueConnected,
    refresh: refreshRevenue,
  } = useRealTimeData("/api/revenue", { enableRealTime: true });

  const {
    data: userData,
    loading: userLoading,
    error: userError,
    isConnected: userConnected,
    refresh: refreshUsers,
  } = useRealTimeData("/api/users", { enableRealTime: true });

  const {
    data: orderData,
    loading: orderLoading,
    error: orderError,
    isConnected: orderConnected,
    refresh: refreshOrders,
  } = useRealTimeData("/api/orders", { enableRealTime: true });

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      if (revenueConnected) refreshRevenue();
      if (userConnected) refreshUsers();
      if (orderConnected) refreshOrders();
    }, 30000);

    return () => clearInterval(interval);
  }, [
    autoRefresh,
    revenueConnected,
    userConnected,
    orderConnected,
    refreshRevenue,
    refreshOrders,
    refreshUsers,
  ]);

  const handleRefreshAll = () => {
    refreshRevenue();
    refreshUsers();
    refreshOrders();
  };

  const getConnectionStatus = () => {
    const connections = [revenueConnected, userConnected, orderConnected];
    const connectedCount = connections.filter(Boolean).length;

    if (connectedCount === 0) return "disconnected";
    if (connectedCount === connections.length) return "connected";

    return "partial";
  };

  if (revenueLoading && userLoading && orderLoading) {
    return <LoadingSpinner />;
  }
  return (
    <div className="real-time-dashboard">
      <div className="dashboard-header">
        <h1>Real-Time Dashboard</h1>
        <div className="dashboard-controls">
          <ConnectionStatus status={getConnectionStatus()} />
          <button
            className="refresh-btn"
            onClick={handleRefreshAll}
            disabled={revenueLoading || userLoading || orderLoading}
          >
            Refresh All
          </button>
          <label className="auto-refresh-toggle">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto Refresh
          </label>
        </div>
      </div>

      <div className="metrics-grid">
        <MetricsCard
          title="Revenue"
          value={revenueData?.total ?? sum(revenueData?.values)}
          change={revenueData?.change ?? 0}
          loading={revenueLoading}
          error={revenueError}
          connected={revenueConnected}
          onRefresh={refreshRevenue}
        />
        <MetricsCard
          title="Users"
          value={userData?.total ?? sum(userData?.values)}
          change={userData?.change ?? 0}
          loading={userLoading}
          error={userError}
          connected={userConnected}
          onRefresh={refreshUsers}
        />
        <MetricsCard
          title="Orders"
          value={orderData?.total ?? sum(orderData?.values)}
          change={orderData?.change ?? 0}
          loading={orderLoading}
          error={orderError}
          connected={orderConnected}
          onRefresh={refreshOrders}
        />
      </div>

      <div className="charts-section">
        <ChartContainer
          data={{
            revenue: revenueData,
            users: userData,
            orders: orderData,
          }}
          selectedMetric={selectedMetric}
          onMetricChange={setSelectedMetric}
          realTime={true}
        />
      </div>
    </div>
  );
}
function LoadingSpinner() {
  return (
    <div className="loading-container">
      <div className="spinner"></div>
      <p>Loading real-time data...</p>
    </div>
  );
}
