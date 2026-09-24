import { usePerformance } from "../hooks/usePerformance.js";

export function PerformanceMonitor() {
  const metrics = usePerformance();

  const entries = Object.entries(metrics).filter(
    ([, v]) => typeof v === "number" && Number.isFinite(v),
  );

  return (
    <section className="performance-panel">
      <h3>Performance Metrics</h3>
      {entries.length === 0 ? (
        <p>Collecting metrics...</p>
      ) : (
        <ul>
          {entries.map(([name, value]) => (
            <li key={name}>
              <span className="metric-name">{name}:</span>{" "}
              <span className="metric-value">{value.toFixed(2)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
