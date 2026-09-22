import { useEffect, useState } from "react";
import api from "../services/api";

export default function Profile() {
  const [me, setMe] = useState(null);
  const [notes, setNotes] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [m, n] = await Promise.all([
          api.getMe().catch(() => null),
          api.getMyNotifications().catch(() => null),
        ]);
        setMe(m?.data || null);
        setNotes(Array.isArray(n?.data) ? n.data : n?.data?.notifications || []);
      } catch (err) {
        setError(err.message);
      }
    })();
  }, []);

  const markRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotes((ns) => ns.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Profile</h1>
      {error && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      {me && (
        <div className="rounded border bg-white p-4 text-sm">
          <p className="font-semibold">{me.name}</p>
          <p className="text-gray-600">{me.email} · {me.role}</p>
        </div>
      )}
      <div className="rounded border bg-white p-4 text-sm">
        <p className="mb-2 font-semibold">My notifications (MongoDB)</p>
        <ul className="flex flex-col gap-2">
          {notes.map((n) => (
            <li key={n.id} className="flex items-center gap-2 border-t py-1">
              <span className={n.isRead ? "text-gray-400" : "font-semibold"}>
                [{n.type}] {n.title || n.message}
              </span>
              {!n.isRead && (
                <button onClick={() => markRead(n.id)} className="ml-auto text-xs underline">
                  mark read
                </button>
              )}
            </li>
          ))}
          {notes.length === 0 && <li className="text-gray-500">No notifications.</li>}
        </ul>
      </div>
    </div>
  );
}
