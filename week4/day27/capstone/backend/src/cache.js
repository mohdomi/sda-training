// Redis wrapper with in-memory fallback so dev/demo never hard-fails.
// Uses: OAuth state/nonce, refresh blacklist, AI response cache.
import { createHash } from 'node:crypto';

let redis = null;
let useRedis = false;
const mem = new Map(); // key -> { val, exp }

async function init() {
  if (redis) return redis;
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  let client = null;
  try {
    const { default: IORedis } = await import('ioredis');
    client = new IORedis(url, {
      lazyConnect: true, maxRetriesPerRequest: 1,
      connectTimeout: 2000, enableOfflineQueue: false,
      // No background retry storms when Redis is down — fail fast, use memory.
      retryStrategy: () => null,
    });
    // Swallow error events from construction onward (else unhandled 'error').
    client.on('error', () => { useRedis = false; });
    await client.connect();
    await client.ping();
    useRedis = true;
    redis = client;
    return redis;
  } catch {
    try { await client?.disconnect(); } catch { /* ignore */ }
    // Reset so a later call retries the connection (e.g. Redis came back).
    initPromise = null;
    useRedis = false;
    redis = null;
    return null;
  }
}

let initPromise = null;

// Lazy: connect on first use, never at import (keeps CLI/tests exiting cleanly).
function ensure() {
  if (!initPromise) initPromise = init();
  return initPromise;
}

export async function ready() {
  await ensure();
  return { redis: useRedis };
}

function memGet(key) {
  const e = mem.get(key);
  if (!e) return null;
  if (e.exp && e.exp < Date.now()) { mem.delete(key); return null; }
  return e.val;
}

export async function get(key) {
  await ensure();
  if (useRedis && redis) {
    try {
      const v = await redis.get(key);
      return v ? JSON.parse(v) : null;
    } catch { /* fall through to memory */ }
  }
  return memGet(key);
}

export async function set(key, val, ttlSec = 300) {
  await ensure();
  if (useRedis && redis) {
    try { await redis.set(key, JSON.stringify(val), 'EX', ttlSec); return; } catch { /* memory */ }
  }
  mem.set(key, { val, exp: Date.now() + ttlSec * 1000 });
}

export async function del(key) {
  await ensure();
  mem.delete(key);
  if (useRedis && redis) {
    try { await redis.del(key); } catch { /* ignore */ }
  }
}

export function aiCacheKey(model, message, history = []) {
  const h = createHash('sha256')
    .update(JSON.stringify([model, message, history.slice(-6)]))
    .digest('hex')
    .slice(0, 32);
  return `ai:${h}`;
}

export async function close() {
  if (redis) { try { await redis.quit(); } catch { /* ignore */ } redis = null; useRedis = false; }
}
