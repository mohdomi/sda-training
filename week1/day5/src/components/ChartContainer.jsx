import PropTypes from "prop-types";

export function ChartContainer({ data, selectedMetric, onMetricChange, realTime }) {
  const metrics = ["users", "revenue", "orders"];
  const raw = (data && data[selectedMetric]) || { labels: [], values: [] };
  const labels = Array.isArray(raw.labels) ? raw.labels : [];
  const values = Array.isArray(raw.values) ? raw.values : [];
  const max = Math.max(...values, 1);

  return (
    <section className="chart-container">
      <div className="chart-tabs">
        {metrics.map((m) => (
          <button
            key={m}
            type="button"
            className={m === selectedMetric ? "active" : ""}
            onClick={() => onMetricChange(m)}
          >
            {m}
          </button>
        ))}
      </div>

      <h3>{selectedMetric} overview</h3>
      <div className="chart-bars">
        {labels.map((label, i) => (
          <div key={label} className="chart-bar-row">
            <span className="chart-label">{label}</span>
            <div className="chart-bar-track">
              <div
                className="chart-bar-fill"
                style={{ width: `${((values[i] || 0) / max) * 100}%` }}
              />
            </div>
            <span className="chart-value">{values[i]}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

const datasetShape = PropTypes.shape({
  labels: PropTypes.arrayOf(PropTypes.string),
  values: PropTypes.arrayOf(PropTypes.number),
});

ChartContainer.propTypes = {
  data: PropTypes.shape({
    users: datasetShape,
    revenue: datasetShape,
    orders: datasetShape,
  }).isRequired,
  selectedMetric: PropTypes.string.isRequired,
  onMetricChange: PropTypes.func.isRequired,
  realTime: PropTypes.bool,
};
