// OpenRouter client (OpenAI-compatible) with mock fallback.
// Verified: liquid/lfm-2.5-2.6b:free primary, cohere/north-mini-code:free fallback.
// Live responses are cached 5 min in Redis (memory fallback) to save free-tier quota.
import * as cache from '../cache.js';
import store from '../db/index.js';
export const MODELS = [
  process.env.OPENROUTER_MODEL || 'liquid/lfm-2.5-2.6b:free',
  process.env.OPENROUTER_FALLBACK_MODEL || 'cohere/north-mini-code:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
].filter(Boolean);
export const MODEL = MODELS[0];
export const FALLBACK = MODELS[1];

async function callOpenRouter(messages, maxTokens = 512, model = MODEL, tools = null) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY missing');
  const body = { model, messages, max_tokens: maxTokens };
  if (tools) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.OPENROUTER_REFERER || 'http://localhost:5173',
      'X-Title': process.env.OPENROUTER_TITLE || 'SDA Capstone MVP',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data?.error) {
    const err = new Error(data.error?.message || 'OpenRouter provider error');
    err.status = data.error?.code === 429 ? 429 : 502;
    err.detail = data;
    throw err;
  }
  if (!res.ok) {
    const err = new Error(`OpenRouter ${res.status}`);
    err.status = res.status === 429 ? 429 : 502;
    err.detail = data;
    throw err;
  }
  const msg = data?.choices?.[0]?.message || {};
  const text = (msg.content || data?.choices?.[0]?.text || '').trim();
  return { text, toolCalls: msg.tool_calls || null, model: data.model || model, raw: data };
}

function mockReply(prompt) {
  return `[mock-ai] No live key/quota. Echo: ${String(prompt).slice(0, 280)}`;
}

export async function chat(message, history = [], opts = {}) {
  // Tool path (user-scoped, never cached): the assistant can pull live
  // tasks + analytics instead of guessing.
  if (opts.userId) return chatWithTools(message, history, opts.userId);
  const t0 = Date.now();
  const messages = [
    { role: 'system', content: 'You are a concise task-management assistant. Keep answers under 150 words unless asked for more.' },
    ...history.slice(-10),
    { role: 'user', content: message },
  ];
  let lastErr = null;
  const cacheKey = cache.aiCacheKey(MODELS[0], message, history);
  try {
    const hit = await cache.get(cacheKey);
    if (hit?.text) return { ...hit, response_time: Date.now() - t0, cached: true };
  } catch { /* cache miss is fine */ }
  for (const m of MODELS) {
    try {
      const r = await callOpenRouter(messages, 512, m);
      if (r.text) {
        const out = { text: r.text, model: r.model, response_time: Date.now() - t0, mocked: false, usedModel: m };
        try { await cache.set(cacheKey, { text: out.text, model: out.model }, 300); } catch { /* ignore */ }
        return out;
      }
      lastErr = new Error('Empty completion');
    } catch (e) {
      lastErr = e;
    }
  }
  return { text: mockReply(message), model: 'mock', response_time: Date.now() - t0, mocked: true, error: lastErr?.message };
}

export async function generateContent({ content_type = 'task-description', topic, tone = 'neutral', length = 'short', keywords = '' }) {
  const prompt = `Write a ${length} ${content_type} about "${topic}" in a ${tone} tone. ${keywords ? `Keywords: ${keywords}.` : ''}`;
  return chat(prompt);
}

export async function summarizeText(text, maxLength = 300) {
  return chat(`Summarize in <= ${maxLength} chars:\n\n${text}`);
}

export async function getRecommendations(profile = {}) {
  const prompt = `Given user profile ${JSON.stringify(profile).slice(0, 500)}, suggest 3 next tasks as a numbered list.`;
  return chat(prompt);
}

// ---------- tool calling: live tasks + analytics for chat ----------
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_tasks',
      description: 'Fetch the user\'s task lists with tasks (title, status, priority). Call this when the user asks about their tasks, what to do next, workload, or progress.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['todo', 'doing', 'done', 'all'], description: 'Filter by status (default all)' },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_analytics',
      description: 'Fetch task stats (totals, completion rate, by status/priority) and AI usage stats. Call this when the user asks about stats, productivity, analytics, or usage.',
      parameters: {
        type: 'object',
        properties: {
          days: { type: 'integer', enum: [7, 30], description: 'Lookback window in days (default 30)' },
        },
        additionalProperties: false,
      },
    },
  },
];

const TOOL_SYSTEM = 'You are a concise task-management assistant with tools. '
  + 'Use get_tasks when the user asks about their tasks and get_analytics for stats questions. '
  + 'Only call a tool when you actually need its data; otherwise answer directly. '
  + 'Keep answers under 150 words unless asked for more. Never invent task titles or numbers — use tool results.';

async function executeTool(name, args, userId) {
  if (name === 'get_tasks') {
    const status = args?.status && args.status !== 'all' ? args.status : null;
    const board = typeof store.getBoard === 'function'
      ? await store.getBoard(userId)
      : (await store.listTasks(userId)).map((t) => ({ ...t }));
    const flat = Array.isArray(board) && board[0]?.tasks !== undefined
      ? board.flatMap((l) => (l.tasks || []).map((t) => ({ ...t, list: l.title })))
      : board;
    const items = (status ? flat.filter((t) => t.status === status) : flat)
      .slice(0, 60)
      .map((t) => `- [${t.status}] ${t.title} (${t.priority || 'medium'}${t.list ? ` · ${t.list}` : ''})`);
    return { tasks: items, total: flat.length, truncated: flat.length > items.length };
  }
  if (name === 'get_analytics') {
    const days = args?.days === 7 ? 7 : 30;
    const a = await store.getAnalytics(userId, days);
    return {
      range: `${days}d`,
      tasks: { total: a.tasks.total, done: a.tasks.done, completion_rate: a.tasks.completion_rate, by_status: a.tasks.by_status },
      ai: { total: a.ai.total, avg_latency_ms: a.ai.avg_latency_ms, by_endpoint: a.ai.by_endpoint },
    };
  }
  throw new Error(`Unknown tool: ${name}`);
}

function parseToolArgs(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch { return {}; }
}

function toolsNotSupported(err) {
  const msg = `${err?.message || ''} ${JSON.stringify(err?.detail || '')}`.toLowerCase();
  return /tool|function|parameter|schema|unrecognized|invalid_request/i.test(msg) && /tool|function|parameter|schema|support|recogn|invalid/i.test(msg);
}

// Naive-dump fallback (small-project approved): embed a compact live snapshot
// when the provider cannot do function calling.
async function naiveContextDump(userId) {
  try {
    const [tasks, analytics] = await Promise.all([
      executeTool('get_tasks', {}, userId),
      executeTool('get_analytics', { days: 30 }, userId),
    ]);
    const lines = tasks.tasks.join('\n').slice(0, 3000);
    return `Live user context (use it, do not invent data):\nTASKS (${tasks.total}):\n${lines}\n`
      + `ANALYTICS(30d): ${analytics.tasks.total} tasks, ${analytics.tasks.done} done, `
      + `${analytics.tasks.completion_rate}% completion; AI calls ${analytics.ai.total}, avg ${analytics.ai.avg_latency_ms}ms.`;
  } catch {
    return '';
  }
}

async function chatWithTools(message, history, userId) {
  const t0 = Date.now();
  const toolsUsed = [];
  const base = [
    { role: 'system', content: TOOL_SYSTEM },
    ...history.slice(-10),
    { role: 'user', content: message },
  ];
  // Attempt 1: real function calling on the primary model.
  try {
    const messages = [...base];
    for (let step = 0; step < 4; step++) {
      const r = await callOpenRouter(messages, 512, MODELS[0], TOOLS);
      const calls = r.toolCalls;
      if (!calls || !calls.length) {
        if (!r.text) throw new Error('Empty completion');
        return { text: r.text, model: r.model, response_time: Date.now() - t0, mocked: false, usedModel: MODELS[0], toolsUsed };
      }
      messages.push({ role: 'assistant', content: r.text || null, tool_calls: calls });
      for (const c of calls) {
        const name = c.function?.name || c.name;
        const args = parseToolArgs(c.function?.arguments ?? c.arguments);
        toolsUsed.push(name);
        let result;
        try {
          result = await executeTool(name, args, userId);
        } catch (e) {
          result = { error: e.message };
        }
        messages.push({ role: 'tool', tool_call_id: c.id, content: JSON.stringify(result).slice(0, 6000) });
      }
    }
    throw new Error('Tool loop did not converge');
  } catch (e) {
    if (!toolsNotSupported(e)) {
      // Real failure (quota/network) → rotation without tools, then mock.
      return chatWithoutTools(message, history, t0);
    }
  }
  // Attempt 2: provider can't do tools → naive live dump + normal rotation.
  const dump = await naiveContextDump(userId);
  const messages = [
    { role: 'system', content: `${TOOL_SYSTEM}\n\n${dump}` },
    ...history.slice(-10),
    { role: 'user', content: message },
  ];
  let lastErr = null;
  for (const m of MODELS) {
    try {
      const r = await callOpenRouter(messages, 512, m);
      if (r.text) {
        return { text: r.text, model: r.model, response_time: Date.now() - t0, mocked: false, usedModel: m, toolsUsed: ['context-dump'] };
      }
      lastErr = new Error('Empty completion');
    } catch (err) {
      lastErr = err;
    }
  }
  return { text: mockReply(message), model: 'mock', response_time: Date.now() - t0, mocked: true, error: lastErr?.message, toolsUsed };
}

async function chatWithoutTools(message, history, t0) {
  const messages = [
    { role: 'system', content: 'You are a concise task-management assistant. Keep answers under 150 words unless asked for more.' },
    ...history.slice(-10),
    { role: 'user', content: message },
  ];
  let lastErr = null;
  for (const m of MODELS) {
    try {
      const r = await callOpenRouter(messages, 512, m);
      if (r.text) {
        return { text: r.text, model: r.model, response_time: Date.now() - t0, mocked: false, usedModel: m, toolsUsed: [] };
      }
      lastErr = new Error('Empty completion');
    } catch (e) {
      lastErr = e;
    }
  }
  return { text: mockReply(message), model: 'mock', response_time: Date.now() - t0, mocked: true, error: lastErr?.message, toolsUsed: [] };
}
