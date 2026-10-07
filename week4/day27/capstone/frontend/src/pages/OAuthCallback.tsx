import { useEffect, useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Handles the full-page redirect fallback: /oauth/callback?code=...
export default function OAuthCallback() {
  const [params] = useSearchParams();
  const { applyCode } = useAuth();
  const nav = useNavigate();
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    const code = params.get('code');
    if (!code) { setErr('Missing OAuth code'); return; }
    applyCode(code).then(() => nav('/')).catch(() => setErr('OAuth exchange failed — try again'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 8, textAlign: 'center' }}>
      {err ? <Typography color="error">{err}</Typography> : <><CircularProgress /><Typography>Signing you in…</Typography></>}
    </Box>
  );
}
