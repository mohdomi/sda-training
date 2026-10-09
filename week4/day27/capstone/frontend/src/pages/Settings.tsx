import { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, FormControlLabel, Switch, Button, Alert, CircularProgress,
} from '@mui/material';
import { PageHeader } from '../components/primitives';
import api from '../services/api';
import { useThemeMode } from '../themeMode';

function Section({ title, description, children }: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
      <Typography variant="subtitle1">{title}</Typography>
      {description && <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{description}</Typography>}
      {children}
    </Paper>
  );
}

export default function Settings() {
  const { mode, setMode } = useThemeMode();
  const [prefs, setPrefs] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('/users/me')
      .then(({ data }) => {
        setProfile(data.user);
        const p = data.user.preferences || {};
        setPrefs({ theme: p.theme || mode, notifications: { email: true, push: true, ...(p.notifications || {}) } });
        if (p.theme && p.theme !== mode) setMode(p.theme);
      })
      .catch(() => setErr('Could not load settings'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setErr(null); setSaved(false);
    try {
      const { data } = await api.patch('/users/me/preferences', prefs);
      setMode(data.preferences.theme || mode);
      setSaved(true);
    } catch {
      setErr('Save failed — check your connection');
    }
  };

  if (!prefs) return <Box sx={{ textAlign: 'center', mt: 6 }}>{err ? <Alert severity="error">{err}</Alert> : <CircularProgress />}</Box>;

  return (
    <Box sx={{ maxWidth: 640, mx: 'auto' }}>
      <PageHeader
        title="Settings"
        description={profile ? `${profile.name} · ${profile.email} · ${profile.provider} · ${profile.role}` : undefined}
        actions={<Button variant="contained" onClick={save}>Save preferences</Button>}
      />

      <Section title="Appearance" description="Theme applies across the workspace.">
        <FormControlLabel
          control={<Switch checked={prefs.theme === 'dark'} onChange={(_, v) => setPrefs({ ...prefs, theme: v ? 'dark' : 'light' })} />}
          label="Dark mode"
        />
      </Section>

      <Section title="Notifications" description="Choose how you want to be notified.">
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <FormControlLabel
            control={<Switch checked={!!prefs.notifications.email} onChange={(_, v) => setPrefs({ ...prefs, notifications: { ...prefs.notifications, email: v } })} />}
            label="Email notifications"
          />
          <FormControlLabel
            control={<Switch checked={!!prefs.notifications.push} onChange={(_, v) => setPrefs({ ...prefs, notifications: { ...prefs.notifications, push: v } })} />}
            label="Push notifications"
          />
        </Box>
      </Section>

      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
      {saved && <Alert severity="success" sx={{ mb: 2 }}>Preferences saved</Alert>}
    </Box>
  );
}
