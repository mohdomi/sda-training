import PropTypes from "prop-types";

export function ChartContainer({ data, selectedMetric, onMetricChange }) {
  const metrics = ["users", "revenue", "orders"];
  const active = data[selectedMetric] ?? { labels: [], values: [] };
  const max = Math.max(...active.values, 1);

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
        {active.labels.map((label, i) => (
          <div key={label} className="chart-bar-row">
            <span className="chart-label">{label}</span>
            <div className="chart-bar-track">
              <div
                className="chart-bar-fill"
                style={{ width: `${(active.values[i] / max) * 100}%` }}
              />
            </div>
            <span className="chart-value">{active.values[i]}</span>
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
};
