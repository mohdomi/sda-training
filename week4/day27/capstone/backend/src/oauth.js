// Google OAuth 2.0 Authorization Code Flow — full-page redirect, no popups.
// Flow: frontend same-tab → GET /google → Google → GET /google/callback →
//   verify (find-or-create by email, link provider, issue JWT pair) →
//   302 to {frontend}/oauth/callback?code=<one-time> → frontend exchanges via
//   POST /oauth/exchange → dashboard. Stateless (session:false), CSRF-safe
//   (state:true + Redis StateStore), tokens never in URLs.
import crypto from 'node:crypto';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Router } from 'express';
import store from './db/index.js';
import * as cache from './cache.js';
import { validate, schemas } from './middleware/validation.js';
import { issuePair } from './middleware/auth.js';

const base = () => (process.env.OAUTH_CALLBACK_BASE || 'http://localhost:5000').replace(/\/$/, '');
const frontend = () => (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
const CALLBACK_PATH = '/api/auth/google/callback';

class RedisStateStore {
  // Carries the real frontend origin (from Referer) alongside the CSRF state,
  // so the handoff works on ANY localhost port, not just FRONTEND_URL.
  async store(req, callback) {
    try {
      const s = crypto.randomUUID();
      const ref = req.headers.referer || req.headers.referrer || '';
      await cache.set(`oastate:${s}`, { ok: 1, ret: allowedOrigin(ref) || frontend() }, 600);
      callback(null, s);
    } catch (e) { callback(e); }
  }

  async verify(req, state, callback) {
    try {
      const v = await cache.get(`oastate:${state}`);
      if (!v) {
        console.warn('oauth google callback: unknown/expired state');
        return callback(null, false);
      }
      // Not deleted here — finishOAuth consumes it after reading ret.
      callback(null, true);
    } catch (e) { callback(e); }
  }
}

// Only same-deployment origins: the configured frontend, or any localhost port
// (dev). Anything else falls back to FRONTEND_URL — never open-redirect.
function allowedOrigin(ref) {
  try {
    const u = new URL(ref);
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    if (u.origin === new URL(frontend()).origin) return u.origin;
    if (['localhost', '127.0.0.1', '[::1]'].includes(u.hostname)) return u.origin;
    return null;
  } catch { return null; }
}

const stateStore = new RedisStateStore();

async function googleVerify(accessToken, refreshToken, profile, done) {
  try {
    const email = profile.emails?.find((e) => e.verified)?.value
      || profile.emails?.[0]?.value;
    if (!email) {
      console.warn('oauth google callback: no email in profile');
      return done(new Error('Google did not return an email (check scopes)'));
    }
    const providerId = String(profile.id);
    const lower = String(email).toLowerCase();
    let user = await store.findUserByEmail(lower);
    if (user) {
      if (user.provider !== 'google' || user.providerId !== providerId) {
        user = await store.linkProvider(user.id, 'google', providerId);
      }
    } else {
      user = await store.createUser({
        name: profile.displayName || lower.split('@')[0],
        email: lower,
        passwordHash: null, // OAuth-only account
        provider: 'google',
        providerId,
        avatar: profile.photos?.[0]?.value || null,
      });
    }
    const pair = await issuePair(user); // requires postgres adapter
    console.log(`oauth google callback: ok user=${lower}`);
    return done(null, {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      pair,
    });
  } catch (e) {
    console.warn(`oauth google callback: verify failed: ${e.message}`);
    return done(e);
  }
}

export function initOAuth() {
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${base()}${CALLBACK_PATH}`,
      scope: ['profile', 'email'],
      state: true,
      store: stateStore,
    }, googleVerify));
    console.log(`oauth: google enabled callback=${base()}${CALLBACK_PATH} frontend=${frontend()}`);
  } else {
    console.log('oauth: google disabled (GOOGLE_CLIENT_ID/SECRET missing)');
  }
}

// Same-tab handoff: mint one-time code, 302 straight to the frontend callback.
// No HTML page, no popup, no postMessage — nothing to get stuck on.
function finishOAuth(req, res) {
  (async () => {
    const payload = req.user; // { user, pair } from googleVerify
    if (!payload?.pair) {
      console.warn('oauth google callback: no pair issued');
      return res.redirect(`${frontend()}/login?oauth=failed`);
    }
    const code = crypto.randomUUID();
    await cache.set(`oauth:${code}`, payload, 300);
    let fe = frontend();
    try {
      const st = req.query?.state;
      if (st) {
        const s = await cache.get(`oastate:${st}`);
        if (s?.ret) fe = s.ret;
        await cache.del(`oastate:${st}`);
      }
    } catch { /* default fe stands */ }
    console.log(`oauth google callback: code issued user=${payload.user.email}`);
    res.redirect(`${fe}/oauth/callback?code=${encodeURIComponent(code)}`);
  })().catch((e) => {
    console.warn(`oauth google callback: handoff failed: ${e.message}`);
    res.redirect(`${frontend()}/login?oauth=failed`);
  });
}

export const oauthRouter = Router();

if (process.env.GOOGLE_CLIENT_ID) {
  oauthRouter.get('/google', (req, res, next) => {
    console.log('oauth google: start');
    passport.authenticate('google', { session: false })(req, res, next);
  });
  oauthRouter.get('/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/api/auth/oauth/failed' }),
    finishOAuth);
}

oauthRouter.get('/oauth/failed', (req, res) => {
  console.warn('oauth google callback: provider or state failure');
  res.redirect(`${frontend()}/login?oauth=failed`);
});

oauthRouter.post('/oauth/exchange', validate(schemas.oauthExchange), async (req, res, next) => {
  try {
    const { code } = req.body;
    const payload = await cache.get(`oauth:${code}`);
    if (!payload) {
      console.warn('oauth exchange: invalid/consumed code');
      return res.status(400).json({ success: false, message: 'Invalid or expired code' });
    }
    await cache.del(`oauth:${code}`);
    console.log(`oauth exchange: ok user=${payload.user.email}`);
    res.json({
      success: true,
      token: payload.pair.accessToken,
      accessToken: payload.pair.accessToken,
      refreshToken: payload.pair.refreshToken,
      user: payload.user,
    });
  } catch (e) { next(e); }
});
