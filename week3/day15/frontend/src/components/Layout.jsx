import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Layout({ children }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const onLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
          <Link to="/" className="font-bold">
            Day 14 Dashboard
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link to="/" className="hover:underline">
              Dashboard
            </Link>
            <Link to="/products" className="hover:underline">
              Products
            </Link>
            <Link to="/orders" className="hover:underline">
              Orders
            </Link>
            {isAdmin && (
              <Link to="/users" className="hover:underline">
                Users
              </Link>
            )}
            <Link to="/profile" className="hover:underline">
              Profile
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-gray-600">{user?.email}</span>
            <span className="rounded bg-gray-200 px-2 py-0.5 text-xs">{user?.role}</span>
            <button onClick={onLogout} className="rounded border px-2 py-1 hover:bg-gray-100">
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
