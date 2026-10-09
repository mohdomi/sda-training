import { useState } from 'react';
import {
  Box, Button, TextField, Typography, Divider, Alert,
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

function AuthShell({ title, subtitle, children }: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ maxWidth: 380, mx: 'auto', mt: { xs: 4, md: 8 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <Box
          sx={{
            width: 36, height: 36, borderRadius: 2, bgcolor: 'primary.main',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'primary.contrastText',
          }}
        >
          <SmartToyIcon fontSize="small" />
        </Box>
        <Box>
          <Typography variant="subtitle1">Task Assistant</Typography>
          <Typography variant="caption" color="text.secondary">AI-powered workspace</Typography>
        </Box>
      </Box>
      <Typography variant="h4" component="h1">{title}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
        {subtitle}
      </Typography>
      {children}
    </Box>
  );
}

export function OAuthButtons() {
  const go = () => {
    // Full-page flow: same tab → backend → Google → backend → frontend
    // callback. No popups, nothing to get stuck.
    window.location.href = '/api/auth/google';
  };
  return (
    <Box sx={{ mt: 2 }}>
      <Divider sx={{ my: 2 }}>or</Divider>
      <Button fullWidth variant="outlined" onClick={go}>Continue with Google</Button>
    </Box>
  );
}

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('demo@capstone.dev');
  const [password, setPassword] = useState('Demo1234!');
  const [err, setErr] = useState<string | null>(null);
  const go = async () => {
    setErr(null);
    try {
      await login(email, password);
      nav('/');
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Login failed — try Register first');
    }
  };
  return (
    <AuthShell title="Welcome back" subtitle="Log in to your workspace to continue.">
      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
      <TextField fullWidth margin="normal" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <TextField
        fullWidth margin="normal" label="Password" type="password" value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && go()}
      />
      <Button fullWidth variant="contained" sx={{ mt: 2 }} onClick={go}>Log in</Button>
      <OAuthButtons />
      <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
        No account? <Link to="/register">Create one</Link>
      </Typography>
    </AuthShell>
  );
}

export function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState('Demo');
  const [email, setEmail] = useState('demo@capstone.dev');
  const [password, setPassword] = useState('Demo1234!');
  const [err, setErr] = useState<string | null>(null);
  const go = async () => {
    setErr(null);
    try {
      await register(name, email, password);
      nav('/');
    } catch (e: any) {
      const data = e?.response?.data;
      const details = Array.isArray(data?.details) ? ` — ${data.details.join('; ')}` : '';
      setErr(`${data?.message || 'Registration failed'}${details}`);
    }
  };
  return (
    <AuthShell title="Create your account" subtitle="Set up a workspace to organize tasks with AI assistance.">
      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
      <TextField fullWidth margin="normal" label="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <TextField fullWidth margin="normal" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <TextField fullWidth margin="normal" label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
        8+ characters with upper, lower, number and special character.
      </Typography>
      <Button fullWidth variant="contained" sx={{ mt: 2 }} onClick={go}>Create account</Button>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
        Already have an account? <Link to="/login">Log in</Link>
      </Typography>
    </AuthShell>
  );
}

export function Dashboard() {
  return (
    <Box sx={{ maxWidth: 720 }}>
      <Typography variant="h4" component="h1" gutterBottom>Dashboard</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Postgres + Redis backend, JWT access/refresh auth with Google sign-in, OpenRouter AI, Socket.io realtime.
      </Typography>
      <Typography variant="body1">
        Start with <Link to="/tasks">Tasks</Link>, ask the <Link to="/ai">AI Assistant</Link>,
        review <Link to="/analytics">Analytics</Link>, or adjust <Link to="/settings">Settings</Link>.
      </Typography>
    </Box>
  );
}
