import { useState, useEffect, useReducer, useCallback } from "react";
import PropTypes from "prop-types";
import { useDataContext } from "../contexts/DataContext.jsx";
import { ErrorBoundary } from "./ErrorBoundary.jsx";
import { DashboardHeader } from "./DashboardHeader.jsx";
import { MetricsGrid } from "./MetricsGrid.jsx";
import { ChartContainer } from "./ChartContainer.jsx";
import { PerformanceMonitor } from "./PerformanceMonitor.jsx";
import "./Dashboard.css";

const initialState = {
  loading: false,
  error: null,
  data: {
    users: { labels: [], values: [] },
    revenue: { labels: [], values: [] },
    orders: { labels: [], values: [] },
  },
  filters: {
    dateRange: "30d",
    category: "all",
  },
};

function dataReducer(state, action) {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload, loading: false };
    case "SET_DATA":
      return { ...state, data: action.payload, loading: false, error: null };
    case "UPDATE_DATASET":
      return {
        ...state,
        data: { ...state.data, [action.key]: action.data },
      };
    case "UPDATE_FILTERS":
      return { ...state, filters: { ...state.filters, ...action.payload } };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

export function Dashboard() {
  const [state, dispatch] = useReducer(dataReducer, initialState);
  const [selectedMetric, setSelectedMetric] = useState("revenue");
  const [viewMode, setViewMode] = useState("grid");

  const { fetchData, subscribe } = useDataContext();

  const loadData = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true });

    try {
      const [users, revenue, orders] = await Promise.all([
        fetchData("/api/users"),
        fetchData("/api/revenue"),
        fetchData("/api/orders"),
      ]);

      dispatch({
        type: "SET_DATA",
        payload: { users, revenue, orders },
      });
    } catch (error) {
      dispatch({
        type: "SET_ERROR",
        payload: error.message,
      });
    }
  }, [fetchData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const handleDataUpdate = (endpoint, data) => {
      const key = endpoint.split("/").pop();
      if (key in initialState.data) {
        dispatch({ type: "UPDATE_DATASET", key, data });
      }
    };

    const unsubscribeFn = subscribe(handleDataUpdate);
    return unsubscribeFn;
  }, [subscribe]);

  const handleFilterChange = (filterType, value) => {
    dispatch({
      type: "UPDATE_FILTERS",
      payload: {
        [filterType]: value,
      },
    });
  };

  if (state.loading) {
    return <LoadingSpinner />;
  }

  if (state.error) {
    return <ErrorMessage error={state.error} onRetry={loadData} />;
  }

  return (
    <ErrorBoundary>
      <div className="dashboard">
        <DashboardHeader
          filters={state.filters}
          onFilterChange={handleFilterChange}
          onRefresh={loadData}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        <div className={`dashboard-content ${viewMode}`}>
          <MetricsGrid data={state.data} />

          <div className="charts-section">
            <ChartContainer
              data={state.data}
              selectedMetric={selectedMetric}
              onMetricChange={setSelectedMetric}
            />
          </div>

          <PerformanceMonitor />
        </div>
      </div>
    </ErrorBoundary>
  );
}

function LoadingSpinner() {
  return (
    <div className="loading-container">
      <div className="spinner"></div>
      <p>Loading dashboard data...</p>
    </div>
  );
}

function ErrorMessage({ error, onRetry }) {
  return (
    <div className="error-container">
      <h2>Error Loading Dashboard</h2>
      <p>{error}</p>
      <button onClick={onRetry} className="retry-btn" type="button">
        Try Again
      </button>
    </div>
  );
}

ErrorMessage.propTypes = {
  error: PropTypes.string.isRequired,
  onRetry: PropTypes.func.isRequired,
};
