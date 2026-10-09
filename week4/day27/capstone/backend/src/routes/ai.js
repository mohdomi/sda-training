import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';
import store from '../db/index.js';
import * as ai from '../services/aiService.js';

const router = express.Router();
router.use(authenticate);
router.use(rateLimit({ windowMs: 60 * 1000, max: 20, message: { success: false, message: 'Too many AI requests' } }));

// Best-effort usage logging: never fails the request.
async function log(endpoint, req, result, promptLen) {
  try {
    if (typeof store.logAI !== 'function') return;
    await store.logAI({
      userId: req.user?.id || null,
      endpoint,
      model: result.model || 'unknown',
      request: { prompt_len: promptLen, cached: Boolean(result.cached) },
      response: result.text,
      latencyMs: result.response_time || 0,
      mocked: Boolean(result.mocked),
    });
  } catch { /* logging must not break responses */ }
}

router.post('/chat', validate(schemas.aiChat), async (req, res) => {
  const { message, history } = req.body;
  const r = await ai.chat(message, history);
  await log('chat', req, r, String(message).length);
  res.json({ success: true, response: r.text, metadata: { model: r.model, response_time: r.response_time, mocked: r.mocked } });
});

router.post('/generate', validate(schemas.aiGenerate), async (req, res) => {
  const r = await ai.generateContent(req.body);
  await log('generate', req, r, JSON.stringify(req.body || {}).length);
  res.json({ success: true, content: r.text, metadata: { model: r.model, mocked: r.mocked } });
});

router.post('/summarize', validate(schemas.aiSummarize), async (req, res) => {
  const { text, max_length } = req.body;
  const r = await ai.summarizeText(text, max_length);
  await log('summarize', req, r, String(text).length);
  res.json({ success: true, summary: r.text, metadata: { model: r.model, mocked: r.mocked } });
});

router.post('/recommendations', validate(schemas.aiRecommendations), async (req, res) => {
  const r = await ai.getRecommendations(req.body);
  await log('recommendations', req, r, JSON.stringify(req.body || {}).length);
  res.json({ success: true, recommendations: r.text, metadata: { model: r.model, mocked: r.mocked } });
});

router.get('/status', (req, res) => {
  res.json({ success: true, model: ai.MODEL, fallback: ai.FALLBACK, hasKey: Boolean(process.env.OPENROUTER_API_KEY) });
});

export default router;
