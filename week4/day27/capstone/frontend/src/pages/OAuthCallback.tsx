import { useEffect, useState } from 'react';
import { Box, CircularProgress, Typography, Button } from '@mui/material';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Completes the full-page flow: /oauth/callback?code=... (or ?oauth=failed)
export default function OAuthCallback() {
  const [params] = useSearchParams();
  const { applyCode } = useAuth();
  const nav = useNavigate();
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (params.get('oauth') === 'failed') { setErr('Google sign-in failed — try again'); return; }
    const code = params.get('code');
    if (!code) { setErr('Missing OAuth code'); return; }
    applyCode(code).then(() => nav('/')).catch(() => setErr('Sign-in code expired — try again'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 8, textAlign: 'center' }}>
      {err ? (
        <><Typography color="error" sx={{ mb: 2 }}>{err}</Typography><Button component={Link} to="/login" variant="outlined">Back to login</Button></>
      ) : (
        <><CircularProgress /><Typography>Signing you in…</Typography></>
      )}
    </Box>
  );
}
