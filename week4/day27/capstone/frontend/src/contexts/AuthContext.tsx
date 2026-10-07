import React, { createContext, useContext, useState } from 'react';
import api, { saveSession, clearSession } from '../services/api';

const Ctx = createContext<any>(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  });
  const apply = (data: any) => { saveSession(data); setUser(data.user); };
  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    apply(data);
  };
  const register = async (name: string, email: string, password: string) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    apply(data);
  };
  const applyCode = async (code: string) => {
    const { data } = await api.post('/auth/oauth/exchange', { code });
    apply(data);
  };
  const logout = async () => {
    const refresh = localStorage.getItem('refreshToken');
    try { if (refresh) await api.post('/auth/logout', { refreshToken: refresh }); } catch { /* ignore */ }
    clearSession();
    setUser(null);
  };
  return <Ctx.Provider value={{ user, login, register, logout, applyCode }}>{children}</Ctx.Provider>;
}
