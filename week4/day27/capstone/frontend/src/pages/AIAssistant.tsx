import { useState } from 'react';
import { Box, Button, List, ListItem, TextField, Typography, Paper, Chip, CircularProgress } from '@mui/material';
import api from '../services/api';

type Msg = { role: string; content: string; meta?: string };

export default function AIAssistant() {
  const [msgs, setMsgs] = useState<Msg[]>([{ role: 'assistant', content: 'Hi! I am your AI task assistant (OpenRouter free model). Ask me to plan, summarize, or draft tasks.' }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!input.trim() || busy) return;
    const history = msgs.map((m) => ({ role: m.role, content: m.content }));
    setMsgs((p) => [...p, { role: 'user', content: input }]);
    setInput(''); setBusy(true);
    try {
      const { data } = await api.post('/ai/chat', { message: input, history });
      setMsgs((p) => [...p, { role: 'assistant', content: data.response, meta: `${data.metadata?.model}${data.metadata?.mocked ? ' (mock)' : ''} · ${data.metadata?.response_time}ms` }]);
    } catch (e: any) {
      setMsgs((p) => [...p, { role: 'assistant', content: e?.response?.data?.message || 'AI request failed. Login first?' }]);
    } finally { setBusy(false); }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>AI Assistant</Typography>
      <Paper sx={{ p: 2, minHeight: 300 }}>
        <List>{msgs.map((m, i) => (
          <ListItem key={i} sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}><b>{m.role === 'user' ? 'You' : 'AI'}:</b> {m.content}</Typography>
            {m.meta && <Chip size="small" label={m.meta} sx={{ mt: 1 }} />}
          </ListItem>))}
        </List>
        {busy && <CircularProgress size={20} />}
      </Paper>
      <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
        <TextField fullWidth size="small" value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Ask AI…" />
        <Button variant="contained" onClick={send} disabled={busy}>Send</Button>
      </Box>
    </Box>
  );
}
