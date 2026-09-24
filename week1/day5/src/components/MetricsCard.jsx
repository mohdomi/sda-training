import { memo, useMemo } from "react";
import PropTypes from "prop-types";

export const MetricsCard = memo(function MetricsCard({
  title,
  value,
  change = 0,
  trend = null,
  icon = "📊",
  onClick = null,
  loading = false,
  error = null,
  connected = null,
  onRefresh = null,
}) {
  const formattedValue = useMemo(() => {
    if (loading) {
      return "…";
    }
    if (typeof value === "number") {
      return value.toLocaleString();
    }
    return value;
  }, [value, loading]);

  const changeClass = useMemo(() => {
    if (change > 0) return "positive";
    if (change < 0) return "negative";
    return "neutral";
  }, [change]);

  if (error) {
    return (
      <div className="metrics-card" onClick={onClick}>
        <div className="card-header">
          <span className="card-icon">{icon}</span>
          <h3 className="card-title">{title}</h3>
        </div>
        <div className="card-content">
          <div className="card-value">{formattedValue}</div>
          <div className="card-error">{String(error)}</div>
        </div>
        {onRefresh && (
          <button type="button" onClick={onRefresh}>
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="metrics-card" onClick={onClick}>
      <div className="card-header">
        <span className="card-icon">{icon}</span>
        <h3 className="card-title">{title}</h3>
        {connected !== null && (
          <span className="card-connection">
            {connected ? "🟢" : "🔴"}
          </span>
        )}
      </div>
      <div className="card-content">
        <div className="card-value">{formattedValue}</div>
        <div className={`card-change ${changeClass}`}>
          {change > 0 ? "+" : ""}
          {change}%
        </div>
      </div>
      {trend && (
        <div className="card-trend">
          <span className="trend-label">Trend:</span>
          <span className="trend-value">{trend}</span>
        </div>
      )}
      {onRefresh && (
        <button type="button" onClick={onRefresh} disabled={loading}>
          Refresh
        </button>
      )}
    </div>
  );
});

MetricsCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  change: PropTypes.number,
  trend: PropTypes.string,
  icon: PropTypes.string,
  onClick: PropTypes.func,
  loading: PropTypes.bool,
  error: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  connected: PropTypes.bool,
  onRefresh: PropTypes.func,
};
