import { useEffect, useState } from 'react';
import {
  Box, Button, TextField, Typography, IconButton, Chip, Checkbox, Divider,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ChecklistIcon from '@mui/icons-material/Checklist';
import { PageHeader, EmptyState } from '../components/primitives';
import api from '../services/api';

const PRIORITY_COLOR: Record<string, 'default' | 'warning' | 'error' | 'success'> = {
  low: 'default',
  medium: 'warning',
  high: 'error',
};

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
  const open = tasks.filter((t) => t.status !== 'done').length;
  return (
    <Box sx={{ maxWidth: 760 }}>
      <PageHeader
        title="Tasks"
        description={tasks.length ? `${open} open · ${tasks.length - open} done` : 'Capture and organize your work.'}
      />
      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
        <TextField fullWidth value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New task… press Enter to add" onKeyDown={(e) => e.key === 'Enter' && add()} />
        <Button variant="contained" onClick={add} sx={{ flexShrink: 0 }}>Add</Button>
      </Box>
      {tasks.length === 0 ? (
        <EmptyState
          icon={<ChecklistIcon fontSize="large" />}
          title="No tasks yet"
          hint="Add your first task above to get started."
        />
      ) : (
        <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {tasks.map((t, i) => (
            <Box key={t.id}>
              {i > 0 && <Divider />}
              <Box
                component="li"
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5, py: 1.25,
                  opacity: t.status === 'done' ? 0.62 : 1,
                }}
              >
                <Checkbox
                  size="small"
                  checked={t.status === 'done'}
                  onChange={() => toggle(t)}
                  aria-label={t.status === 'done' ? 'Reopen task' : 'Complete task'}
                  sx={{ p: 0.5 }}
                />
                <Typography
                  variant="body1"
                  sx={{
                    flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis',
                    textDecoration: t.status === 'done' ? 'line-through' : 'none',
                  }}
                >
                  {t.title}
                </Typography>
                {t.priority && t.priority !== 'medium' && (
                  <Chip size="small" variant="outlined" label={t.priority} color={PRIORITY_COLOR[t.priority] || 'default'} />
                )}
                <IconButton
                  size="small"
                  onClick={() => summarize(t)}
                  aria-label="Summarize with AI"
                  title="Summarize with AI"
                >
                  <AutoAwesomeIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => remove(t.id)} aria-label="Delete task">
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
