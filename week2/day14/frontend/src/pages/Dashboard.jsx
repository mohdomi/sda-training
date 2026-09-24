import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [h, p] = await Promise.all([
          api.getHealth().catch(() => null),
          api.getProducts({ limit: 5 }).catch(() => null),
        ]);
        setHealth(h);
        setProducts(p?.data?.products || []);
        if (isAdmin) {
          const a = await api.getAnalytics().catch(() => null);
          setStats(a?.data || null);
          const o = await api.getOrders({ limit: 5 }).catch(() => null);
          setOrders(o?.data?.orders || []);
        } else {
          const o = await api.getMyOrders().catch(() => null);
          setOrders(Array.isArray(o?.data) ? o.data.slice(0, 5) : []);
        }
      } catch (err) {
        setError(err.message);
      }
    })();
  }, [isAdmin]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      {error && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      {isAdmin && (
        <div className="grid grid-cols-3 gap-4">
          {[
            ["Users (Mongo)", stats?.users],
            ["Products (Postgres)", stats?.products],
            ["Orders (Postgres)", stats?.orders],
          ].map(([label, v]) => (
            <div key={label} className="rounded border bg-white p-4">
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-3xl font-bold">{v ?? "—"}</p>
            </div>
          ))}
        </div>
      )}
      <div className="rounded border bg-white p-4 text-sm">
        <p className="font-semibold">Backend health</p>
        <pre className="mt-1 overflow-auto text-xs text-gray-600">
          {health ? JSON.stringify(health, null, 2) : "unreachable (is the API on :3000?)"}
        </pre>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded border bg-white p-4">
          <p className="mb-2 font-semibold">Latest products</p>
          <ul className="text-sm">
            {products.map((p) => (
              <li key={p.id} className="flex justify-between border-t py-1">
                <span>{p.name}</span>
                <span className="text-gray-500">${p.price}</span>
              </li>
            ))}
            {products.length === 0 && <li className="text-gray-500">No products yet.</li>}
          </ul>
        </div>
        <div className="rounded border bg-white p-4">
          <p className="mb-2 font-semibold">Recent orders</p>
          <ul className="text-sm">
            {orders.map((o) => (
              <li key={o.id} className="flex justify-between border-t py-1">
                <span className="truncate">{String(o.id).slice(0, 8)}…</span>
                <span className="text-gray-500">{o.status}</span>
              </li>
            ))}
            {orders.length === 0 && <li className="text-gray-500">No orders yet.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
