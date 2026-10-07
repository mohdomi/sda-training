import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

function getTokens() {
  return {
    access: localStorage.getItem('token'),
    refresh: localStorage.getItem('refreshToken'),
  };
}

export function saveSession(data: { token?: string; accessToken?: string; refreshToken?: string | null; user: any }) {
  const access = data.accessToken || data.token;
  if (access) localStorage.setItem('token', access);
  if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
  else localStorage.removeItem('refreshToken');
  localStorage.setItem('user', JSON.stringify(data.user));
}

export function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}

api.interceptors.request.use((c) => {
  const { access } = getTokens();
  if (access) c.headers.Authorization = `Bearer ${access}`;
  return c;
});

let refreshing: Promise<string | null> | null = null;

async function refreshAccess(): Promise<string | null> {
  if (!refreshing) {
    refreshing = (async () => {
      const { refresh } = getTokens();
      if (!refresh) return null;
      try {
        const { data } = await axios.post('/api/auth/refresh', { refreshToken: refresh });
        if (data.accessToken) localStorage.setItem('token', data.accessToken);
        if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
        return data.accessToken as string;
      } catch {
        clearSession();
        return null;
      } finally {
        refreshing = null;
      }
    })();
  }
  return refreshing;
}

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const orig = err.config;
    if (err.response?.status === 401 && !orig._retried && !orig.url?.includes('/auth/')) {
      orig._retried = true;
      const access = await refreshAccess();
      if (access) {
        orig.headers.Authorization = `Bearer ${access}`;
        return api(orig);
      }
    }
    throw err;
  },
);

export default api;
