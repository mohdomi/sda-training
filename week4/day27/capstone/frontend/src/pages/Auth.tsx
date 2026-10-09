import { useEffect, useState } from 'react';
import {
  Box, Button, TextField, Typography, Divider, Alert, Paper,
  CircularProgress, Chip, Grid,
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { Stat } from '../components/primitives';

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

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function Dashboard() {
  const { user } = useAuth();
  const [board, setBoard] = useState<any[] | null>(null);
  const [stats, setStats] = useState<any | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.get('/lists'), api.get('/analytics/overview?range=7d')])
      .then(([{ data: b }, { data: s }]) => {
        setBoard(b.lists);
        setStats(s);
      })
      .catch(() => setErr('Could not load your overview.'));
  }, []);

  const openTasks = (board || [])
    .flatMap((l: any) => (l.tasks || []).map((t: any) => ({ ...t, listTitle: l.title })))
    .filter((t: any) => t.status !== 'done')
    .slice(0, 3);
  const todayTasks = stats?.tasks?.per_day?.[stats.tasks.per_day.length - 1]?.count ?? 0;
  const todayAI = stats?.ai?.per_day?.[stats.ai.per_day.length - 1]?.count ?? 0;
  const topEndpoint = stats?.ai?.by_endpoint?.[0];

  return (
    <Box sx={{ maxWidth: 860 }}>
      <Typography variant="h3" component="h1" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
        {greeting()}, {user?.name || 'there'}.
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mt: 1, mb: 4 }}>
        Here is your workspace at a glance.
      </Typography>

      {err && <Alert severity="error" sx={{ mb: 3 }}>{err}</Alert>}
      {!board || !stats ? (
        !err && <Box sx={{ textAlign: 'center', mt: 4 }}><CircularProgress /></Box>
      ) : (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2.5 }}>
                <Stat label="Open tasks" value={stats.tasks.total - stats.tasks.done} />
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2.5 }}>
                <Stat label="Done this week" value={`${stats.tasks.completion_rate}%`} />
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2.5 }}>
                <Stat label="AI calls today" value={todayAI} />
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2.5 }}>
                <Stat label="Tasks added today" value={todayTasks} />
              </Paper>
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid item xs={12} md={7}>
              <Paper variant="outlined" sx={{ p: 2.5, height: '100%' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle1">Up next</Typography>
                  <Button size="small" component={Link} to="/tasks" endIcon={<ArrowForwardIcon fontSize="small" />}>
                    All tasks
                  </Button>
                </Box>
                {openTasks.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Nothing open — enjoy the clear board, or <Link to="/tasks">add a task</Link>.
                  </Typography>
                ) : (
                  openTasks.map((t: any) => (
                    <Box key={t.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1, borderTop: 1, borderColor: 'divider' }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body1" noWrap>{t.title}</Typography>
                        <Typography variant="caption" color="text.secondary">{t.listTitle}</Typography>
                      </Box>
                      {t.priority && t.priority !== 'medium' && (
                        <Chip size="small" variant="outlined" label={t.priority} />
                      )}
                    </Box>
                  ))
                )}
              </Paper>
            </Grid>
            <Grid item xs={12} md={5}>
              <Paper variant="outlined" sx={{ p: 2.5, height: '100%' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle1">AI usage</Typography>
                  <Button size="small" component={Link} to="/analytics" endIcon={<ArrowForwardIcon fontSize="small" />}>
                    Analytics
                  </Button>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {stats.ai.total} calls in 7 days · avg {stats.ai.avg_latency_ms}ms
                  {topEndpoint ? ` · mostly ${topEndpoint.endpoint}` : ''}
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Button variant="contained" component={Link} to="/ai">
                    Ask the AI Assistant
                  </Button>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
}
