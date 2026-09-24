import PropTypes from "prop-types";

export function DashboardHeader({
  filters,
  onFilterChange,
  onRefresh,
  viewMode,
  onViewModeChange,
}) {
  return (
    <header className="dashboard-header">
      <div className="header-filters">
        <label>
          Date range:
          <select
            value={filters.dateRange}
            onChange={(e) => onFilterChange("dateRange", e.target.value)}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </label>

        <label>
          Category:
          <select
            value={filters.category}
            onChange={(e) => onFilterChange("category", e.target.value)}
          >
            <option value="all">All</option>
            <option value="users">Users</option>
            <option value="revenue">Revenue</option>
            <option value="orders">Orders</option>
          </select>
        </label>
      </div>

      <div className="header-actions">
        <button type="button" onClick={onRefresh} className="refresh-btn">
          Refresh Data
        </button>
        <button
          type="button"
          onClick={() =>
            onViewModeChange(viewMode === "grid" ? "list" : "grid")
          }
          className="view-btn"
        >
          View: {viewMode}
        </button>
      </div>
    </header>
  );
}

DashboardHeader.propTypes = {
  filters: PropTypes.shape({
    dateRange: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired,
  }).isRequired,
  onFilterChange: PropTypes.func.isRequired,
  onRefresh: PropTypes.func.isRequired,
  viewMode: PropTypes.string.isRequired,
  onViewModeChange: PropTypes.func.isRequired,
};
