import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, Button, TextField, Typography, IconButton, Checkbox, Divider, Select, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, Paper, Alert,
  useMediaQuery, useTheme,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ChecklistIcon from '@mui/icons-material/Checklist';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { DragDropProvider, DragOverlay, PointerSensor, useDroppable } from '@dnd-kit/react';
import { PointerActivationConstraints } from '@dnd-kit/dom';
import { CollisionPriority } from '@dnd-kit/abstract';
import { useSortable } from '@dnd-kit/react/sortable';
import type { DragOverEvent, DragEndEvent, DragStartEvent } from '@dnd-kit/react';
import { move } from '@dnd-kit/helpers';
import { PageHeader, EmptyState } from '../components/primitives';
import { MarkdownText } from '../components/Markdown';
import api from '../services/api';

type Task = {
  id: string; listId: string; position: number; title: string;
  description?: string; priority?: string; status?: string;
};
type BoardList = { id: string; title: string; position: number; tasks: Task[] };

// Long-press to drag on touch (lets lists scroll normally); small move on mouse.
const sensors = [
  PointerSensor.configure({
    activationConstraints: (event) =>
      event.pointerType === 'touch'
        ? [new PointerActivationConstraints.Delay({ value: 250, tolerance: 8 })]
        : [new PointerActivationConstraints.Distance({ value: 6 })],
  }),
];

function TaskRow({ task, listId, index, onToggle, onRemove, onPriority }: {
  task: Task; listId: string; index: number;
  onToggle: (t: Task) => void; onRemove: (id: string) => void;
  onPriority: (t: Task, priority: string) => void;
}) {
  const { ref, handleRef, isDragging } = useSortable({
    id: `task:${task.id}`, index, group: `list:${listId}`, type: 'task',
    accept: ['task'], // rows only ever receive tasks — lists/dropzones handle the rest
  });
  return (
    <Box
      ref={ref}
      data-testid={`task-row-${task.id}`}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1, py: 1,
        opacity: isDragging ? 0.35 : tOpacity(task),
      }}
    >
      <Box
        ref={handleRef}
        aria-label="Drag task"
        data-testid="task-grip"
        sx={{
          display: 'flex', cursor: 'grab', color: 'text.disabled',
          touchAction: 'none', p: 0.5, borderRadius: 1,
          '&:active': { cursor: 'grabbing' },
        }}
      >
        <DragIndicatorIcon fontSize="small" />
      </Box>
      <Checkbox
        size="small"
        checked={task.status === 'done'}
        onChange={() => onToggle(task)}
        aria-label={task.status === 'done' ? 'Reopen task' : 'Complete task'}
        sx={{ p: 0.5 }}
      />
      <Typography
        variant="body1"
        sx={{
          flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis',
          textDecoration: task.status === 'done' ? 'line-through' : 'none',
        }}
      >
        {task.title}
      </Typography>
      <Select
        size="small"
        value={task.priority || 'medium'}
        onChange={(e) => onPriority(task, e.target.value)}
        aria-label="Task priority"
        variant="standard"
        disableUnderline
        sx={{
          fontSize: '0.75rem',
          color: task.priority === 'high' ? 'error.main' : task.priority === 'low' ? 'text.secondary' : 'warning.main',
          ml: -0.5,
          '& .MuiSelect-select': { py: 0.5, pr: 2.5, pl: 0.5, borderRadius: 1 },
        }}
      >
        {['low', 'medium', 'high'].map((p) => (
          <MenuItem key={p} value={p} sx={{ fontSize: '0.8rem' }}>{p}</MenuItem>
        ))}
      </Select>
      <IconButton size="small" onClick={() => onRemove(task.id)} aria-label="Delete task">
        <DeleteOutlineIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}

function tOpacity(t: Task) {
  return t.status === 'done' ? 0.62 : 1;
}

function MasonryBoard({ lists, renderList }: {
  lists: BoardList[];
  renderList: (list: BoardList, flatIndex: number) => React.ReactNode;
}) {
  const theme = useTheme();
  const threeUp = useMediaQuery(theme.breakpoints.up('lg'));
  const twoUp = useMediaQuery(theme.breakpoints.up('sm'));
  const colCount = threeUp ? 3 : twoUp ? 2 : 1;
  // Round-robin by FLAT index: visual slot (col,row) always maps back to the
  // same linear position, so drag/drop + persist logic stays index-based.
  const columns = useMemo(() => {
    const cols: { list: BoardList; flatIndex: number }[][] = Array.from({ length: colCount }, () => []);
    lists.forEach((list, flatIndex) => {
      cols[flatIndex % colCount].push({ list, flatIndex });
    });
    return cols;
  }, [lists, colCount]);
  return (
    <Box data-testid="board-grid" sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
      {columns.map((col, ci) => (
        <Box
          key={ci}
          data-testid={`board-col-${ci}`}
          sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          {col.map(({ list, flatIndex }) => renderList(list, flatIndex))}
        </Box>
      ))}
    </Box>
  );
}

function ListDropZone({ listId, active }: { listId: string; active: boolean }) {
  const { ref, isDropTarget } = useDroppable({
    id: `drop:${listId}`, accept: ['task'], collisionPriority: CollisionPriority.Low,
  });
  return (
    <Box
      ref={ref}
      sx={{
        border: 1, borderStyle: 'dashed', borderRadius: 1.5,
        borderColor: isDropTarget ? 'primary.main' : 'divider',
        bgcolor: isDropTarget ? 'action.hover' : 'transparent',
        color: 'text.disabled',
        textAlign: 'center', py: active ? 1.5 : 0.75,
        fontSize: '0.8rem',
        transition: 'background-color 120ms, border-color 120ms',
      }}
    >
      {isDropTarget ? 'Release to drop here' : 'Drop tasks here'}
    </Box>
  );
}

export default function Tasks() {
  const [lists, setLists] = useState<BoardList[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [newListTitle, setNewListTitle] = useState('');
  const [addingList, setAddingList] = useState(false);
  const [summary, setSummary] = useState<{ title: string; text: string } | null>(null);
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [active, setActive] = useState<{ kind: 'task' | 'list'; title: string } | null>(null);
  const snapshot = useRef<BoardList[] | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/lists');
      setLists(data.lists);
      setLoadErr(null);
    } catch {
      setLoadErr('Could not load your lists.');
    }
  }, []);

  useEffect(() => { load().catch(() => {}); }, [load]);

  // ---- list CRUD (unchanged endpoints) ----
  const createList = async () => {
    if (!newListTitle.trim()) return;
    const { data } = await api.post('/lists', { title: newListTitle.trim() });
    setLists((p) => [...p, { ...data.list, tasks: [] }]);
    setNewListTitle('');
    setAddingList(false);
  };

  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  const saveRename = async (id: string) => {
    if (!renameText.trim()) { setRenaming(null); return; }
    const { data } = await api.patch(`/lists/${id}`, { title: renameText.trim() });
    setLists((p) => p.map((l) => (l.id === id ? { ...l, title: data.list.title } : l)));
    setRenaming(null);
  };

  const removeList = async (list: BoardList) => {
    if (!window.confirm(`Delete "${list.title}" and its ${list.tasks.length} tasks?`)) return;
    await api.delete(`/lists/${list.id}`);
    setLists((p) => p.filter((l) => l.id !== list.id));
  };

  // ---- per-list task add + toggle + delete (same endpoints as before) ----
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [draftPrio, setDraftPrio] = useState<Record<string, string>>({});
  const addTask = async (listId: string) => {
    const title = (drafts[listId] || '').trim();
    if (!title) return;
    const priority = draftPrio[listId] || 'medium';
    const { data } = await api.post('/tasks', { title, listId, priority });
    setLists((p) => p.map((l) => (l.id === listId ? { ...l, tasks: [...l.tasks, data.task] } : l)));
    setDrafts((p) => ({ ...p, [listId]: '' }));
  };

  const toggle = async (t: Task) => {
    const { data } = await api.patch(`/tasks/${t.id}`, { status: t.status === 'done' ? 'todo' : 'done' });
    setLists((p) => p.map((l) => ({
      ...l, tasks: l.tasks.map((x) => (x.id === t.id ? data.task : x)),
    })));
  };

  const remove = async (id: string) => {
    await api.delete(`/tasks/${id}`);
    setLists((p) => p.map((l) => ({ ...l, tasks: l.tasks.filter((x) => x.id !== id) })));
  };

  const setPriority = async (t: Task, priority: string) => {
    if (t.priority === priority) return;
    setLists((p) => p.map((l) => ({
      ...l, tasks: l.tasks.map((x) => (x.id === t.id ? { ...x, priority } : x)),
    })));
    try {
      const { data } = await api.patch(`/tasks/${t.id}`, { priority });
      setLists((p) => p.map((l) => ({
        ...l, tasks: l.tasks.map((x) => (x.id === t.id ? data.task : x)),
      })));
    } catch {
      // roll back to the server value on failure
      setLists((p) => p.map((l) => ({
        ...l, tasks: l.tasks.map((x) => (x.id === t.id ? { ...x, priority: t.priority } : x)),
      })));
    }
  };

  // ---- per-LIST AI summary (richer context than single tasks) ----
  const summarizeList = async (list: BoardList) => {
    setSummary({ title: list.title, text: '' });
    setSummaryBusy(true);
    try {
      const lines = list.tasks.map((t, i) => `${i + 1}. ${t.title}${t.description ? ` — ${t.description}` : ''} [${t.status}]`);
      const text = `Task list "${list.title}" with ${list.tasks.length} tasks:\n${lines.join('\n')}`;
      const { data } = await api.post('/ai/summarize', { text });
      setSummary({ title: list.title, text: data.summary });
    } catch {
      setSummary({ title: list.title, text: 'Could not generate a summary — try again.' });
    } finally {
      setSummaryBusy(false);
    }
  };

  // ---- drag & drop ----
  const parseId = (raw: unknown): { kind: 'task' | 'list' | 'drop'; id: string } | null => {
    if (typeof raw !== 'string') return null;
    const i = raw.indexOf(':');
    if (i < 0) return null;
    const kind = raw.slice(0, i);
    if (kind !== 'task' && kind !== 'list' && kind !== 'drop') return null;
    return { kind, id: raw.slice(i + 1) };
  };

  function sameRecord(a: Record<string, string[]>, b: Record<string, string[]>): boolean {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    return (
      ka.length === kb.length &&
      ka.every((k) => Array.isArray(b[k]) && a[k].length === b[k].length && a[k].every((v, i) => v === b[k][i]))
    );
  }

  const onDragStart = (event: DragStartEvent) => {
    snapshot.current = lists;
    const p = parseId((event.operation.source as any)?.id);
    if (!p) return;
    if (p.kind === 'task') {
      const found = lists.flatMap((l) => l.tasks.map((t) => ({ l, t }))).find((x) => x.t.id === p.id);
      if (found) setActive({ kind: 'task', title: found.t.title });
    } else if (p.kind === 'list') {
      const list = lists.find((l) => l.id === p.id);
      if (list) setActive({ kind: 'list', title: list.title });
    }
  };

  const onDragOver = (event: DragOverEvent) => {
    const src: any = event.operation.source;
    if (!src || typeof src.id !== 'string') return;
    const tgt: any = event.operation.target;
    const tid = typeof tgt?.id === 'string' ? (tgt.id as string) : '';

    // Lists reorder explicitly in state (same pattern as tasks below).
    if (src.type === 'task-list') {
      if (!tid.startsWith('list:')) return;
      const overId = tid.slice(5);
      setLists((prev) => {
        const from = prev.findIndex((l) => `list:${l.id}` === String(src.id));
        const to = prev.findIndex((l) => l.id === overId);
        if (from < 0 || to < 0 || from === to) return prev;
        const next = [...prev];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return next;
      });
      return;
    }

    if (src.type !== 'task') return;
    const activeId = src.id as string;
    setLists((prev) => {
      const record: Record<string, string[]> = {};
      const entities = new Map<string, Task>();
      prev.forEach((l) => {
        record[`list:${l.id}`] = l.tasks.map((t) => {
          entities.set(`task:${t.id}`, t);
          return `task:${t.id}`;
        });
      });
      if (!entities.has(activeId)) return prev;
      let next: Record<string, string[]>;
      if (tid.startsWith('task:') && entities.has(tid)) {
        try {
          next = move(record, event);
        } catch {
          return prev;
        }
      } else if (tid.startsWith('drop:') || tid.startsWith('list:')) {
        // Explicit drop zone, or a list container itself (rows win ties thanks
        // to priority) → append to that list.
        const key = `list:${tid.slice(tid.indexOf(':') + 1)}`;
        if (!record[key]) return prev;
        next = {};
        for (const k of Object.keys(record)) {
          next[k] = record[k].filter((id) => id !== activeId);
        }
        next[key] = [...next[key], activeId];
      } else {
        return prev;
      }
      if (sameRecord(record, next)) return prev;
      return prev.map((l) => ({
        ...l,
        tasks: (next[`list:${l.id}`] ?? [])
          .map((id) => entities.get(id))
          .filter((t): t is Task => Boolean(t)),
      }));
    });
  };

  const persistMoves = async (before: BoardList[], after: BoardList[]) => {
    // Exact positional rewrite of every changed list: positions are always
    // (index+1)*1024, so stale client ranks can never poison the outcome.
    const beforeSig = new Map(before.map((l) => [l.id, l.tasks.map((t) => t.id).join(',')]));
    for (const list of after) {
      const sig = list.tasks.map((t) => t.id).join(',');
      if (beforeSig.get(list.id) === sig) continue; // untouched list
      const beforeLists = new Map(before.map((l) => [l.id, l]));
      for (let i = 0; i < list.tasks.length; i++) {
        const t = list.tasks[i];
        const patch: Record<string, unknown> = { position: (i + 1) * 1024 };
        const wasIn = beforeLists.get(list.id)?.tasks.some((x) => x.id === t.id);
        if (!wasIn) patch.listId = list.id; // arrived from another list
        await api.patch(`/tasks/${t.id}`, patch);
      }
    }
  };

  const onDragEnd = async (event: DragEndEvent) => {
    const s = parseId((event.operation.source as any)?.id);
    setActive(null);
    const before = snapshot.current;
    snapshot.current = null;
    if (!before) return;
    if ((event as any).canceled) {
      setLists(before);
      return;
    }
    try {
      if (s?.kind === 'list') {
        const beforeOrder = (before as BoardList[]).map((l) => l.id).join(',');
        const afterOrder = lists.map((l) => l.id).join(',');
        if (beforeOrder !== afterOrder) {
          await api.patch('/lists/order', { orderedIds: lists.map((l) => l.id) });
        }
      } else if (s?.kind === 'task') {
        await persistMoves(before, lists);
      }
      // silent re-sync so float-ranks match the server exactly
      const { data } = await api.get('/lists');
      setLists(data.lists);
      setSaveErr(null);
    } catch {
      const res = await api.get('/lists').catch(() => null);
      if (res) setLists(res.data.lists);
      else setLists(before);
      setSaveErr('Could not save the new order — restored previous positions.');
    }
  };

  const total = lists.reduce((n, l) => n + l.tasks.length, 0);
  const open = lists.reduce((n, l) => n + l.tasks.filter((t) => t.status !== 'done').length, 0);

  return (
    <Box>
      <PageHeader
        title="Tasks"
        description={total ? `${open} open · ${total - open} done · ${lists.length} lists` : 'Capture and organize your work.'}
        actions={
          addingList ? (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small" autoFocus placeholder="List name…"
                value={newListTitle} onChange={(e) => setNewListTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') createList();
                  if (e.key === 'Escape') setAddingList(false);
                }}
              />
              <Button variant="contained" size="small" onClick={createList}>Create</Button>
            </Box>
          ) : (
            <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => setAddingList(true)}>
              New list
            </Button>
          )
        }
      />
      {loadErr && <Alert severity="error" sx={{ mb: 2 }}>{loadErr}</Alert>}
      {saveErr && <Alert severity="warning" sx={{ mb: 2 }}>{saveErr}</Alert>}

      {lists.length === 0 && !loadErr ? (
        <EmptyState
          icon={<ChecklistIcon fontSize="large" />}
          title="No lists yet"
          hint="Create your first list to get started."
        />
      ) : (
        <DragDropProvider sensors={sensors} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
          <MasonryBoard
            lists={lists}
            renderList={(list, listIndex) => (
              <TaskListSection
                key={list.id}
                list={list}
                index={listIndex}
                renaming={renaming === list.id}
                renameText={renameText}
                onRenameText={setRenameText}
                onStartRename={() => { setRenaming(list.id); setRenameText(list.title); }}
                onSaveRename={() => saveRename(list.id)}
                onCancelRename={() => setRenaming(null)}
                onRemove={() => removeList(list)}
                onSummarize={() => summarizeList(list)}
                draft={drafts[list.id] || ''}
                draftPrio={draftPrio[list.id] || 'medium'}
                onDraft={(v) => setDrafts((p) => ({ ...p, [list.id]: v }))}
                onDraftPrio={(v) => setDraftPrio((p) => ({ ...p, [list.id]: v }))}
                onAddTask={() => addTask(list.id)}
                onToggle={toggle}
                onRemoveTask={remove}
                onPriority={setPriority}
                overlayActive={active !== null}
              />
            )}
          />
          <DragOverlay>
            {active ? (
              <Paper elevation={4} sx={{ px: 2, py: 1.25, maxWidth: 480 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                  {active.kind === 'list' ? `List: ${active.title}` : active.title}
                </Typography>
              </Paper>
            ) : null}
          </DragOverlay>
        </DragDropProvider>
      )}

      <Dialog
        open={summary !== null}
        onClose={() => setSummary(null)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          backdrop: {
            sx: {
              backgroundColor: 'rgba(0, 0, 0, 0.28)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            },
          },
        }}
        aria-labelledby="summary-title"
      >
        <DialogTitle id="summary-title">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoAwesomeIcon fontSize="small" color="primary" />
            <Typography variant="subtitle1" noWrap>{summary?.title}</Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">AI summary</Typography>
        </DialogTitle>
        <DialogContent dividers>
          {summaryBusy ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }}>
              <CircularProgress size={18} />
              <Typography variant="body2" color="text.secondary">Summarizing…</Typography>
            </Box>
          ) : (
            summary?.text ? <MarkdownText text={summary.text} /> : null
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSummary(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function TaskListSection({ list, index, renaming, renameText, onRenameText, onStartRename, onSaveRename, onCancelRename, onRemove, onSummarize, draft, draftPrio, onDraft, onDraftPrio, onAddTask, onToggle, onRemoveTask, onPriority, overlayActive }: {
  list: BoardList; index: number;
  renaming: boolean; renameText: string; onRenameText: (v: string) => void;
  onStartRename: () => void; onSaveRename: () => void; onCancelRename: () => void;
  onRemove: () => void; onSummarize: () => void;
  draft: string; draftPrio: string; onDraft: (v: string) => void; onDraftPrio: (v: string) => void; onAddTask: () => void;
  onToggle: (t: Task) => void; onRemoveTask: (id: string) => void; onPriority: (t: Task, p: string) => void;
  overlayActive: boolean;
}) {
  const { ref, handleRef, isDragging } = useSortable({
    id: `list:${list.id}`, index, type: 'task-list',
    // Default accept (all): lists must receive list-drags. Low priority lets
    // task rows win pointer ties; the drop zone takes the rest.
    collisionPriority: CollisionPriority.Low,
  });
  return (
    <Paper
      ref={ref}
      variant="outlined"
      data-testid={`task-list-${list.id}`}
      sx={{
        p: 2, opacity: isDragging ? 0.4 : 1,
        display: 'flex', flexDirection: 'column',
        maxHeight: 'min(68vh, 640px)',
        minWidth: 0,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexShrink: 0 }}>
        <Box
          ref={handleRef}
          aria-label={`Drag list ${list.title}`}
          sx={{
            display: 'flex', cursor: 'grab', color: 'text.disabled',
            touchAction: 'none', p: 0.5, borderRadius: 1,
            '&:active': { cursor: 'grabbing' },
          }}
        >
          <DragIndicatorIcon fontSize="small" />
        </Box>
        {renaming ? (
          <TextField
            size="small" autoFocus value={renameText} onChange={(e) => onRenameText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveRename();
              if (e.key === 'Escape') onCancelRename();
            }}
            onBlur={onSaveRename}
            sx={{ flex: 1 }}
          />
        ) : (
          <Typography variant="subtitle1" sx={{ flex: 1, minWidth: 0 }} noWrap>
            {list.title} <Typography component="span" variant="caption" color="text.secondary">· {list.tasks.length}</Typography>
          </Typography>
        )}
        <IconButton size="small" onClick={onStartRename} aria-label="Rename list">
          <EditIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={onSummarize} aria-label="Summarize list with AI" title="Summarize list with AI">
          <AutoAwesomeIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={onRemove} aria-label="Delete list">
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Box>

      <Divider sx={{ mb: 0.5, flexShrink: 0 }} />

      <Box data-testid={`task-scroll-${list.id}`} sx={{ overflowY: 'auto', minHeight: 0 }}>
        {list.tasks.map((t, ti) => (
          <Box key={t.id}>
            {ti > 0 && <Divider />}
            <TaskRow task={t} listId={list.id} index={ti} onToggle={onToggle} onRemove={onRemoveTask} onPriority={onPriority} />
          </Box>
        ))}
      </Box>

      <Box sx={{ display: 'flex', gap: 1, mt: 1, flexShrink: 0 }}>
        <TextField
          size="small" fullWidth placeholder={`Add a task to ${list.title}…`}
          value={draft} onChange={(e) => onDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAddTask()}
        />
        <Select
          size="small" value={draftPrio} onChange={(e) => onDraftPrio(e.target.value)}
          aria-label="New task priority" sx={{ flexShrink: 0, fontSize: '0.8rem' }}
        >
          {['low', 'medium', 'high'].map((p) => (
            <MenuItem key={p} value={p} sx={{ fontSize: '0.8rem' }}>{p}</MenuItem>
          ))}
        </Select>
        <Button variant="outlined" size="small" onClick={onAddTask} sx={{ flexShrink: 0 }}>Add</Button>
      </Box>

      <Box sx={{ mt: 1, flexShrink: 0 }}>
        <ListDropZone listId={list.id} active={overlayActive} />
      </Box>
    </Paper>
  );
}
