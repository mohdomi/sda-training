// OAuth 2.0 Authorization Code Flow (Google + GitHub), stateless JWT API style.
// Latest-correct notes applied:
// - session:false everywhere (no server sessions; we issue our own JWT pair)
// - `state: true` with a Redis-backed StateStore (CSRF protection, works single-instance via memory fallback)
// - Google scopes ['profile','email'] (email required for find-or-create)
// - GitHub scope ['user:email'] (covers private emails via the emails API)
// - No tokens in URLs: callback mints a one-time code (Redis, 5 min), frontend
//   exchanges it via POST /api/auth/oauth/exchange. Popup uses postMessage(code).
import crypto from 'node:crypto';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Router } from 'express';
import store from './db/index.js';
import * as cache from './cache.js';
import { issuePair } from './middleware/auth.js';

const base = () => (process.env.OAUTH_CALLBACK_BASE || 'http://localhost:5000').replace(/\/$/, '');
const frontend = () => (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');

class RedisStateStore {
  async store(req, callback) {
    try {
      const s = crypto.randomUUID();
      await cache.set(`oastate:${s}`, { ok: 1 }, 600);
      callback(null, s);
    } catch (e) { callback(e); }
  }

  async verify(req, state, callback) {
    try {
      const v = await cache.get(`oastate:${state}`);
      if (!v) return callback(null, false);
      await cache.del(`oastate:${state}`);
      callback(null, true);
    } catch (e) { callback(e); }
  }
}

const stateStore = new RedisStateStore();

function verifyCallback(provider) {
  return async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.find((e) => e.verified ?? e.value)?.value
        || profile.emails?.[0]?.value;
      if (!email) return done(new Error(`${provider} did not return an email (check scopes)`));
      const providerId = String(profile.id);
      const lower = String(email).toLowerCase();
      let user = await store.findUserByEmail(lower);
      if (user) {
        if (user.provider !== provider || user.providerId !== providerId) {
          user = await store.linkProvider(user.id, provider, providerId);
        }
      } else {
        user = await store.createUser({
          name: profile.displayName || lower.split('@')[0],
          email: lower,
          passwordHash: null, // OAuth-only account
          provider,
          providerId,
          avatar: profile.photos?.[0]?.value || null,
        });
      }
      const pair = await issuePair(user); // requires postgres adapter
      return done(null, {
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        pair,
      });
    } catch (e) {
      return done(e);
    }
  };
}

export function initOAuth() {
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${base()}/api/auth/google/callback`,
      scope: ['profile', 'email'],
      state: true,
      store: stateStore,
    }, verifyCallback('google')));
  }
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(new GitHubStrategy({
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: `${base()}/api/auth/github/callback`,
      scope: ['user:email'],
      state: true,
      store: stateStore,
    }, verifyCallback('github')));
  }
}

function finishOAuth(req, res) {
  (async () => {
    const payload = req.user; // { user, pair } from verify callback
    if (!payload?.pair) return res.redirect(`${frontend()}/login?oauth=failed`);
    const code = crypto.randomUUID();
    await cache.set(`oauth:${code}`, payload, 300);
    const fe = frontend();
    res.send(`<!doctype html><html><body><script>
      (function(){
        var msg = ${JSON.stringify(JSON.stringify({ code }))};
        try { if (window.opener) window.opener.postMessage(msg, ${JSON.stringify(fe)}); } catch(e){}
        window.location.replace(${JSON.stringify(`${fe}/oauth/callback?code=`)} + ${JSON.stringify(code)});
      })();
    </script><p>Signing you in…</p></body></html>`);
  })().catch(() => res.redirect(`${frontend()}/login?oauth=failed`));
}

export const oauthRouter = Router();

if (process.env.GOOGLE_CLIENT_ID) {
  oauthRouter.get('/google', passport.authenticate('google', { session: false }));
  oauthRouter.get('/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/api/auth/oauth/failed' }),
    finishOAuth);
}

if (process.env.GITHUB_CLIENT_ID) {
  oauthRouter.get('/github', passport.authenticate('github', { session: false }));
  oauthRouter.get('/github/callback',
    passport.authenticate('github', { session: false, failureRedirect: '/api/auth/oauth/failed' }),
    finishOAuth);
}

oauthRouter.get('/oauth/failed', (req, res) => {
  res.redirect(`${frontend()}/login?oauth=failed`);
});

oauthRouter.post('/oauth/exchange', async (req, res, next) => {
  try {
    const { code } = req.body || {};
    if (!code) return res.status(400).json({ success: false, message: 'code required' });
    const payload = await cache.get(`oauth:${code}`);
    if (!payload) return res.status(400).json({ success: false, message: 'Invalid or expired code' });
    await cache.del(`oauth:${code}`);
    res.json({
      success: true,
      token: payload.pair.accessToken,
      accessToken: payload.pair.accessToken,
      refreshToken: payload.pair.refreshToken,
      user: payload.user,
    });
  } catch (e) { next(e); }
});
