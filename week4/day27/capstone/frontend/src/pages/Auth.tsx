import { useState } from 'react';
import { Box, Button, TextField, Typography, Paper, Divider } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

function oauthPopup(provider: 'google' | 'github') {
  const w = window.open(`/api/auth/${provider}`, '_blank', 'width=500,height=650');
  return new Promise<string>((resolve, reject) => {
    const timer = setInterval(() => { if (w?.closed) { clearInterval(timer); reject(new Error('OAuth popup closed')); } }, 500);
    const onMsg = async (ev: MessageEvent) => {
      try {
        const data = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data;
        if (data?.code) {
          clearInterval(timer);
          window.removeEventListener('message', onMsg);
          w?.close();
          resolve(data.code);
        }
      } catch { /* ignore foreign messages */ }
    };
    window.addEventListener('message', onMsg);
    setTimeout(() => { clearInterval(timer); window.removeEventListener('message', onMsg); reject(new Error('OAuth timed out')); }, 120000);
  });
}

export function OAuthButtons() {
  const { applyCode } = useAuth();
  const nav = useNavigate();
  const go = async (provider: 'google' | 'github') => {
    try {
      const code = await oauthPopup(provider);
      await applyCode(code);
      nav('/');
    } catch {
      // Popup blocked/closed → full-page redirect fallback
      window.location.href = `/api/auth/${provider}`;
    }
  };
  return (
    <Box sx={{ mt: 2 }}>
      <Divider sx={{ my: 2 }}>or</Divider>
      <Button fullWidth variant="outlined" sx={{ mb: 1 }} onClick={() => go('google')}>Continue with Google</Button>
      <Button fullWidth variant="outlined" onClick={() => go('github')}>Continue with GitHub</Button>
    </Box>
  );
}

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('demo@capstone.dev');
  const [password, setPassword] = useState('Demo1234!');
  const go = async () => { await login(email, password).catch(async () => { alert('Login failed — try Register first'); }); nav('/'); };
  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 6 }}>
      <Typography variant="h5">Login</Typography>
      <TextField fullWidth margin="normal" label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <TextField fullWidth margin="normal" label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <Button fullWidth variant="contained" sx={{ mt: 2 }} onClick={go}>Login</Button>
      <OAuthButtons />
      <Typography sx={{ mt: 2 }}>No account? <Link to="/register">Register</Link></Typography>
    </Box>
  );
}

export function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState('Demo');
  const [email, setEmail] = useState('demo@capstone.dev');
  const [password, setPassword] = useState('Demo1234!');
  const go = async () => { await register(name, email, password); nav('/'); };
  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 6 }}>
      <Typography variant="h5">Register</Typography>
      <TextField fullWidth margin="normal" label="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <TextField fullWidth margin="normal" label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <TextField fullWidth margin="normal" label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <Button fullWidth variant="contained" sx={{ mt: 2 }} onClick={go}>Create account</Button>
    </Box>
  );
}

export function Dashboard() {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5">AI-Powered Task Management</Typography>
      <Typography sx={{ mt: 1 }}>Postgres + Redis backend, JWT access/refresh auth with Google/GitHub OAuth, OpenRouter AI, Socket.io realtime.</Typography>
    </Paper>
  );
}
