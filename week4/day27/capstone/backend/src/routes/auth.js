import express from 'express';
import bcrypt from 'bcryptjs';
import store from '../db/index.js';
import * as cache from '../cache.js';
import { sign, issuePair, rotateRefresh, revokeFamilyByToken, authenticate, validatePassword } from '../middleware/auth.js';

const router = express.Router();

function pairPayload(user, pair) {
  return {
    success: true,
    token: pair.accessToken, // back-compat alias for existing clients
    accessToken: pair.accessToken,
    refreshToken: pair.refreshToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

async function issuePairWithFallback(user) {
  try {
    return await issuePair(user);
  } catch (e) {
    if (e.status === 501) return { accessToken: sign(user), refreshToken: null, familyId: null, legacy: true };
    throw e;
  }
}

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ success: false, message: 'name/email/password required' });
    validatePassword(password);
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await store.createUser({ name, email, passwordHash });
    const pair = await issuePairWithFallback(user);
    res.status(201).json(pairPayload(user, pair));
  } catch (e) { next(e); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const user = await store.findUserByEmail(email || '');
    if (!user || !user.passwordHash) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const ok = await bcrypt.compare(password || '', user.passwordHash);
    if (!ok) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const pair = await issuePairWithFallback(user);
    res.json(pairPayload(user, pair));
  } catch (e) { next(e); }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return res.status(400).json({ success: false, message: 'refreshToken required' });
    const pair = await rotateRefresh(refreshToken, cache);
    res.json({ success: true, token: pair.accessToken, ...pair });
  } catch (e) { next(e); }
});

router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body || {};
  if (refreshToken) await revokeFamilyByToken(refreshToken);
  res.json({ success: true, message: 'Logged out' });
});

router.get('/me', authenticate, (req, res) => {
  res.json({ success: true, user: req.user });
});

// OAuth status (providers wired in src/oauth.js when keys present)
router.get('/oauth/status', (req, res) => {
  res.json({ success: true, providers: { google: Boolean(process.env.GOOGLE_CLIENT_ID), github: Boolean(process.env.GITHUB_CLIENT_ID) } });
});

export default router;
