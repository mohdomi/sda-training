import { useState } from 'react';
import {
  Box, Button, TextField, Typography, Chip, CircularProgress,
  Tabs, Tab, MenuItem, Select, FormControl, InputLabel, Divider,
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { PageHeader, EmptyState } from '../components/primitives';
import { MarkdownText } from '../components/Markdown';
import api from '../services/api';

type Msg = { role: string; content: string; meta?: string };

function ChatTab() {
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
      setMsgs((p) => [...p, { role: 'assistant', content: e?.response?.data?.details?.join('; ') || e?.response?.data?.message || 'AI request failed' }]);
    } finally { setBusy(false); }
  };

  return (
    <Box sx={{ maxWidth: 760, mx: 'auto', display: 'flex', flexDirection: 'column', minHeight: '60vh' }}>
      <Box sx={{ flex: 1 }}>
        {msgs.map((m, i) => (
          <Box key={i} sx={{ py: 1.5 }}>
            {i > 0 && <Divider sx={{ mb: 1.5 }} />}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              {m.role === 'user' ? 'You' : 'Assistant'}
            </Typography>
            {m.role === 'user' ? (
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{m.content}</Typography>
            ) : (
              <MarkdownText text={m.content} />
            )}
            {m.meta && <Chip size="small" variant="outlined" label={m.meta} sx={{ mt: 1 }} />}
          </Box>
        ))}
        {busy && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
            <CircularProgress size={16} />
            <Typography variant="body2" color="text.secondary">Thinking…</Typography>
          </Box>
        )}
      </Box>
      <Box
        sx={{
          display: 'flex', gap: 1, mt: 2, pt: 2, position: 'sticky', bottom: 0,
          bgcolor: 'background.default', borderTop: 1, borderColor: 'divider',
        }}
      >
        <TextField
          fullWidth multiline maxRows={4} value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Ask AI… (Enter to send, Shift+Enter for newline)"
        />
        <Button variant="contained" onClick={send} disabled={busy || !input.trim()} sx={{ flexShrink: 0, alignSelf: 'flex-end' }}>
          Send
        </Button>
      </Box>
    </Box>
  );
}

function GenerateTab() {
  const [topic, setTopic] = useState('sprint retro');
  const [contentType, setContentType] = useState('task-description');
  const [tone, setTone] = useState('neutral');
  const [length, setLength] = useState('short');
  const [keywords, setKeywords] = useState('');
  const [out, setOut] = useState('');
  const [meta, setMeta] = useState('');
  const [busy, setBusy] = useState(false);

  const go = async () => {
    if (!topic.trim() || busy) return;
    setBusy(true); setOut('');
    try {
      const { data } = await api.post('/ai/generate', { topic, content_type: contentType, tone, length, keywords });
      setOut(data.content);
      setMeta(`${data.metadata?.model}${data.metadata?.mocked ? ' (mock)' : ''}`);
    } catch (e: any) {
      setOut(e?.response?.data?.details?.join('; ') || e?.response?.data?.message || 'Generation failed');
    } finally { setBusy(false); }
  };

  return (
    <Box sx={{ maxWidth: 760, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <TextField label="Topic" value={topic} onChange={(e) => setTopic(e.target.value)} />
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <FormControl sx={{ minWidth: 160 }}>
          <InputLabel>Type</InputLabel>
          <Select value={contentType} label="Type" onChange={(e) => setContentType(e.target.value)}>
            {['task-description', 'summary', 'report', 'email', 'plan'].map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 140 }}>
          <InputLabel>Tone</InputLabel>
          <Select value={tone} label="Tone" onChange={(e) => setTone(e.target.value)}>
            {['neutral', 'formal', 'casual', 'urgent'].map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Length</InputLabel>
          <Select value={length} label="Length" onChange={(e) => setLength(e.target.value)}>
            {['short', 'medium', 'long'].map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>
      <TextField label="Keywords (optional)" value={keywords} onChange={(e) => setKeywords(e.target.value)} />
      <Box>
        <Button variant="contained" onClick={go} disabled={busy || !topic.trim()}>
          {busy ? 'Generating…' : 'Generate'}
        </Button>
      </Box>
      {out && (
        <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
          <MarkdownText text={out} />
          {meta && <Chip size="small" variant="outlined" label={meta} sx={{ mt: 1 }} />}
        </Box>
      )}
    </Box>
  );
}

function RecommendTab() {
  const [out, setOut] = useState('');
  const [busy, setBusy] = useState(false);

  const go = async () => {
    setBusy(true); setOut('');
    try {
      const { data } = await api.post('/ai/recommendations', {});
      setOut(data.recommendations);
    } catch (e: any) {
      setOut(e?.response?.data?.message || 'Recommendations failed');
    } finally { setBusy(false); }
  };

  return (
    <Box sx={{ maxWidth: 760, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="body2" color="text.secondary">Get AI-suggested next tasks based on your profile.</Typography>
      <Box>
        <Button variant="contained" onClick={go} disabled={busy}>
          {busy ? 'Thinking…' : 'Suggest my next tasks'}
        </Button>
      </Box>
      {out && (
        <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
          <MarkdownText text={out} />
        </Box>
      )}
    </Box>
  );
}

export default function AIAssistant() {
  const [tab, setTab] = useState(0);
  return (
    <Box sx={{ maxWidth: 760, mx: 'auto' }}>
      <PageHeader
        title="AI Assistant"
        description="Chat, generate content, or get recommendations from your connected models."
      />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Chat" /><Tab label="Generate" /><Tab label="Recommend" />
      </Tabs>
      {tab === 0 && <ChatTab />}
      {tab === 1 && <GenerateTab />}
      {tab === 2 && <RecommendTab />}
    </Box>
  );
}

export function AssistantEmpty() {
  return (
    <EmptyState
      icon={<SmartToyIcon fontSize="large" />}
      title="No conversation yet"
      hint="Send your first message to begin."
    />
  );
}
