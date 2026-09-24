import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Products() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", description: "", price: "", category: "", stock: "" });

  const load = async () => {
    setError("");
    try {
      const res = await api.getProducts({ limit: 20, ...(search ? { search } : {}) });
      setItems(res.data?.products || []);
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
      await api.createProduct({
        ...form,
        price: Number(form.price),
        stock: Number(form.stock) || 0,
      });
      setForm({ name: "", description: "", price: "", category: "", stock: "" });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this product?")) return;
    try {
      await api.deleteProduct(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Products (PostgreSQL)</h1>
      <div className="flex gap-2">
        <input
          className="rounded border p-2 text-sm"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button onClick={load} className="rounded border px-3 text-sm hover:bg-gray-100">
          Search
        </button>
      </div>
      {error && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      {isAdmin && (
        <form onSubmit={create} className="grid grid-cols-5 gap-2 rounded border bg-white p-3 text-sm">
          <input className="rounded border p-2" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="rounded border p-2" placeholder="Description (10+ chars)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          <input className="rounded border p-2" placeholder="Price" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
          <input className="rounded border p-2" placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required />
          <div className="flex gap-2">
            <input className="w-full rounded border p-2" placeholder="Stock" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
            <button className="rounded bg-black px-3 text-white">Add</button>
          </div>
        </form>
      )}
      <ul className="grid grid-cols-3 gap-3">
        {items.map((p) => (
          <li key={p.id} className="rounded border bg-white p-3 text-sm">
            <p className="font-semibold">{p.name}</p>
            <p className="text-gray-500">{p.category} · stock {p.stock}</p>
            <p className="mt-1 line-clamp-2 text-gray-600">{p.description}</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="font-bold">${p.price}</span>
              {isAdmin && (
                <button onClick={() => remove(p.id)} className="text-red-600 hover:underline">
                  Delete
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {items.length === 0 && <p className="text-sm text-gray-500">No products.</p>}
    </div>
  );
}
