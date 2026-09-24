import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Orders() {
  const { isAdmin } = useAuth();
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    productId: "",
    quantity: 1,
    street: "",
    city: "",
    zipCode: "",
    country: "USA",
  });

  const load = async () => {
    setError("");
    try {
      const [o, p] = await Promise.all([
        isAdmin ? api.getOrders({ limit: 20 }) : api.getMyOrders(),
        api.getProducts({ limit: 50 }),
      ]);
      setOrders(isAdmin ? o.data?.orders || [] : Array.isArray(o.data) ? o.data : []);
      setProducts(p.data?.products || []);
      if (!form.productId && (p.data?.products || []).length) {
        setForm((f) => ({ ...f, productId: p.data.products[0].id }));
      }
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const create = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const product = products.find((p) => p.id === form.productId);
      await api.createOrder({
        items: [{ productId: form.productId, quantity: Number(form.quantity), price: Number(product.price) }],
        shippingAddress: {
          street: form.street,
          city: form.city,
          zipCode: form.zipCode,
          country: form.country,
        },
      });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const setStatus = async (id, status) => {
    try {
      await api.updateOrderStatus(id, status);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Orders (PostgreSQL)</h1>
      {error && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      <form onSubmit={create} className="grid grid-cols-6 gap-2 rounded border bg-white p-3 text-sm">
        <select className="rounded border p-2" value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} required>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} (${p.price})
            </option>
          ))}
        </select>
        <input className="rounded border p-2" type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
        <input className="rounded border p-2" placeholder="Street" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} required />
        <input className="rounded border p-2" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
        <input className="rounded border p-2" placeholder="ZIP" value={form.zipCode} onChange={(e) => setForm({ ...form, zipCode: e.target.value })} required />
        <button className="rounded bg-black px-3 text-white">Place order</button>
      </form>
      <ul className="flex flex-col gap-2 text-sm">
        {orders.map((o) => (
          <li key={o.id} className="rounded border bg-white p-3">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs">{String(o.id).slice(0, 8)}…</span>
              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">{o.status}</span>
              <span className="ml-auto font-bold">${o.totalAmount}</span>
              {isAdmin && (
                <select
                  className="rounded border p-1 text-xs"
                  value={o.status}
                  onChange={(e) => setStatus(o.id, e.target.value)}
                >
                  {["pending", "confirmed", "shipped", "delivered", "cancelled"].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <ul className="mt-1 text-xs text-gray-600">
              {(o.items || []).map((it, i) => (
                <li key={i}>
                  {it.quantity} × {String(it.productId).slice(0, 8)}… @ ${it.price}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      {orders.length === 0 && <p className="text-sm text-gray-500">No orders.</p>}
    </div>
  );
}
