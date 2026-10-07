// OpenRouter client (OpenAI-compatible) with mock fallback.
// Verified: liquid/lfm-2.5-2.6b:free primary, cohere/north-mini-code:free fallback.
// Live responses are cached 5 min in Redis (memory fallback) to save free-tier quota.
import * as cache from '../cache.js';
export const MODELS = [
  process.env.OPENROUTER_MODEL || 'liquid/lfm-2.5-2.6b:free',
  process.env.OPENROUTER_FALLBACK_MODEL || 'cohere/north-mini-code:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
].filter(Boolean);
export const MODEL = MODELS[0];
export const FALLBACK = MODELS[1];

function extractText(data) {
  const msg = data?.choices?.[0]?.message || {};
  return (msg.content || data?.choices?.[0]?.text || '').trim();
}

async function callOpenRouter(messages, maxTokens = 512, model = MODEL) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY missing');
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.OPENROUTER_REFERER || 'http://localhost:5173',
      'X-Title': process.env.OPENROUTER_TITLE || 'SDA Capstone MVP',
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
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
  const text = extractText(data);
  return { text, model: data.model || model, raw: data };
}

function mockReply(prompt) {
  return `[mock-ai] No live key/quota. Echo: ${String(prompt).slice(0, 280)}`;
}

export async function chat(message, history = []) {
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
