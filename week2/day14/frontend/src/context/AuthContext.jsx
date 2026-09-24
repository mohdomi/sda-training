import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Revalidate session on boot if a token exists
    if (api.accessToken && !user) {
      api
        .getMe()
        .then((res) => {
          const u = res.data;
          setUser(u);
          localStorage.setItem("user", JSON.stringify(u));
        })
        .catch(() => api.clearTokens());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (credentials) => {
    setLoading(true);
    try {
      const res = await api.login(credentials);
      setUser(res.data.user);
      return res;
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload) => {
    setLoading(true);
    try {
      const res = await api.register(payload);
      setUser(res.data.user);
      return res;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, isAdmin: user?.role === "admin" }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
