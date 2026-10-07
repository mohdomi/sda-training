import { useEffect, useState } from 'react';
import { Box, Button, TextField, Typography, Paper, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../services/api';

export default function Tasks() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const load = async () => { const { data } = await api.get('/tasks'); setTasks(data.tasks); };
  useEffect(() => { load().catch(() => {}); }, []);
  const add = async () => {
    if (!title.trim()) return;
    const { data } = await api.post('/tasks', { title });
    setTasks((p) => [data.task, ...p]); setTitle('');
  };
  const toggle = async (t: any) => {
    const { data } = await api.patch(`/tasks/${t.id}`, { status: t.status === 'done' ? 'todo' : 'done' });
    setTasks((p) => p.map((x) => (x.id === t.id ? data.task : x)));
  };
  const remove = async (id: string) => { await api.delete(`/tasks/${id}`); setTasks((p) => p.filter((x) => x.id !== id)); };
  const summarize = async (t: any) => {
    const { data } = await api.post('/ai/summarize', { text: `${t.title}\n${t.description || ''}` });
    alert(data.summary);
  };
  return (
    <Box>
      <Typography variant="h5" gutterBottom>Tasks</Typography>
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField size="small" fullWidth value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New task…" onKeyDown={(e) => e.key === 'Enter' && add()} />
        <Button variant="contained" onClick={add}>Add</Button>
      </Box>
      {tasks.map((t) => (
        <Paper key={t.id} sx={{ p: 2, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ flex: 1, textDecoration: t.status === 'done' ? 'line-through' : 'none' }}>{t.title}</Typography>
          <Button size="small" onClick={() => toggle(t)}>{t.status === 'done' ? 'Reopen' : 'Done'}</Button>
          <Button size="small" onClick={() => summarize(t)}>AI Summary</Button>
          <IconButton onClick={() => remove(t.id)}><DeleteIcon /></IconButton>
        </Paper>
      ))}
    </Box>
  );
}
