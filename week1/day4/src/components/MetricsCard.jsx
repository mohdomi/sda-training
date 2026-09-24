import { memo, useMemo } from "react";
import PropTypes from "prop-types";

export const MetricsCard = memo(function MetricsCard({
  title,
  value,
  change = 0,
  trend = null,
  icon = "📊",
  onClick = null,
}) {
  const formattedValue = useMemo(() => {
    if (typeof value === "number") {
      return value.toLocaleString();
    }
    return value;
  }, [value]);

  const changeClass = useMemo(() => {
    if (change > 0) return "positive";
    if (change < 0) return "negative";
    return "neutral";
  }, [change]);

  return (
    <div className="metrics-card" onClick={onClick}>
      <div className="card-header">
        <span className="card-icon">{icon}</span>
        <h3 className="card-title">{title}</h3>
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
};
