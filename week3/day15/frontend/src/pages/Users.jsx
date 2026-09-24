import { useEffect, useState } from "react";
import api from "../services/api";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const res = await api.getUsers({ limit: 20 });
      setUsers(res.data?.users || []);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (id) => {
    if (!confirm("Delete this user?")) return;
    try {
      await api.deleteUser(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Users (MongoDB, admin)</h1>
      {error && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      <table className="rounded border bg-white text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="p-2">Name</th>
            <th className="p-2">Email</th>
            <th className="p-2">Role</th>
            <th className="p-2">Active</th>
            <th className="p-2" />
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b">
              <td className="p-2">{u.name}</td>
              <td className="p-2">{u.email}</td>
              <td className="p-2">{u.role}</td>
              <td className="p-2">{String(u.isActive)}</td>
              <td className="p-2 text-right">
                <button onClick={() => remove(u.id)} className="text-red-600 hover:underline">
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {users.length === 0 && <p className="text-sm text-gray-500">No users.</p>}
    </div>
  );
}
