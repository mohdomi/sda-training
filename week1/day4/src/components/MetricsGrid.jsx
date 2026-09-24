import PropTypes from "prop-types";
import { MetricsCard } from "./MetricsCard.jsx";

function sum(values = []) {
  return values.reduce((a, b) => a + b, 0);
}

export function MetricsGrid({ data }) {
  const usersTotal = sum(data.users?.values);
  const revenueTotal = sum(data.revenue?.values);
  const ordersTotal = sum(data.orders?.values);

  return (
    <section className="metrics-grid">
      <MetricsCard
        title="Users"
        value={usersTotal}
        change={12.5}
        trend="up"
        icon="👥"
      />
      <MetricsCard
        title="Revenue"
        value={revenueTotal}
        change={8.3}
        trend="up"
        icon="💰"
      />
      <MetricsCard
        title="Orders"
        value={ordersTotal}
        change={-2.1}
        trend="down"
        icon="📦"
      />
    </section>
  );
}

const datasetShape = PropTypes.shape({
  labels: PropTypes.arrayOf(PropTypes.string),
  values: PropTypes.arrayOf(PropTypes.number),
});

MetricsGrid.propTypes = {
  data: PropTypes.shape({
    users: datasetShape,
    revenue: datasetShape,
    orders: datasetShape,
  }).isRequired,
};
