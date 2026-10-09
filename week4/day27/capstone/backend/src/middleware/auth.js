import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import store from '../db/index.js';

const SECRET = process.env.JWT_SECRET || 'capstone-dev-secret-change-me';
const ACCESS_TTL = process.env.ACCESS_TOKEN_TTL || '15m';
const REFRESH_TTL = process.env.REFRESH_TOKEN_TTL || '30d';

export function sha256(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

// Back-compat single token (file adapter / legacy clients)
export function sign(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    issuer: 'capstone-api',
  });
}

export function signAccess(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role, type: 'access' }, SECRET, {
    expiresIn: ACCESS_TTL,
    issuer: 'capstone-api',
    audience: 'capstone-client',
  });
}

function signRefreshToken(user, familyId, jti) {
  return jwt.sign({ id: user.id, type: 'refresh', family: familyId, jti }, SECRET, {
    expiresIn: REFRESH_TTL,
    issuer: 'capstone-api',
  });
}

function refreshExpiry() {
  return new Date(Date.now() + 30 * 24 * 3600 * 1000);
}

function requireRefreshStore() {
  if (typeof store.saveRefreshToken !== 'function') {
    const e = new Error('Refresh rotation requires DB_ADAPTER=postgres');
    e.status = 501;
    throw e;
  }
}

export async function issuePair(user) {
  requireRefreshStore();
  const familyId = crypto.randomUUID();
  const jti = crypto.randomUUID();
  const refreshToken = signRefreshToken(user, familyId, jti);
  await store.saveRefreshToken({
    userId: user.id, familyId, tokenHash: sha256(refreshToken), expiresAt: refreshExpiry(),
  });
  return { accessToken: signAccess(user), refreshToken, familyId };
}

export async function rotateRefresh(refreshToken, cache) {
  requireRefreshStore();
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, SECRET, { issuer: 'capstone-api' });
  } catch {
    const e = new Error('Invalid refresh token');
    e.status = 401;
    throw e;
  }
  if (decoded.type !== 'refresh') {
    const e = new Error('Not a refresh token');
    e.status = 401;
    throw e;
  }
  const hash = sha256(refreshToken);
  if (cache) {
    const blacklisted = await cache.get(`bl:${hash}`);
    if (blacklisted) {
      // Reuse of revoked token = possible theft → kill whole family
      await store.revokeFamily(decoded.family);
      const e = new Error('Refresh token revoked');
      e.status = 401;
      throw e;
    }
  }
  const row = await store.findRefreshByHash(hash);
  if (!row || row.revoked_at || new Date(row.expires_at) < new Date()) {
    if (row) await store.revokeFamily(row.family_id || decoded.family);
    const e = new Error('Refresh token expired or revoked');
    e.status = 401;
    throw e;
  }
  const user = await store.findUserById(decoded.id);
  if (!user || !user.isActive) {
    const e = new Error('User inactive');
    e.status = 401;
    throw e;
  }
  // Rotate: revoke presented token, blacklist it briefly, issue new pair same family
  await store.revokeToken(hash);
  if (cache) await cache.set(`bl:${hash}`, { r: 1 }, 30 * 24 * 3600);
  const jti = crypto.randomUUID();
  const next = signRefreshToken(user, row.family_id, jti);
  await store.saveRefreshToken({
    userId: user.id, familyId: row.family_id, tokenHash: sha256(next), expiresAt: refreshExpiry(),
  });
  return { accessToken: signAccess(user), refreshToken: next, familyId: row.family_id };
}

export async function revokeFamilyByToken(refreshToken) {
  try {
    const decoded = jwt.verify(refreshToken, SECRET, { issuer: 'capstone-api' });
    if (decoded.family && typeof store.revokeFamily === 'function') {
      await store.revokeFamily(decoded.family);
    }
  } catch { /* logout is best-effort */ }
}

export async function authenticate(req, res, next) {
  try {
    const h = req.headers.authorization || '';
    if (!h.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Token required' });
    const decoded = jwt.verify(h.slice(7), SECRET, { issuer: 'capstone-api' });
    if (decoded.type === 'refresh') return res.status(401).json({ success: false, message: 'Access token required' });
    const user = await store.findUserById(decoded.id);
    if (!user || !user.isActive) return res.status(401).json({ success: false, message: 'User inactive' });
    req.user = { id: user.id, email: user.email, role: user.role, name: user.name };
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Auth required' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ success: false, message: 'Forbidden' });
    next();
  };
}

export function validatePassword(password) {
  const errors = [];
  if (!password || password.length < 8) errors.push('Password must be at least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('Password must contain an uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('Password must contain a lowercase letter');
  if (!/\d/.test(password)) errors.push('Password must contain a number');
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('Password must contain a special character');
  if (errors.length) {
    const e = new Error('Password validation failed');
    e.status = 400;
    e.details = errors;
    throw e;
  }
  return true;
}
