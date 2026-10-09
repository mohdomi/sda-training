# OAuth — Google-only, full-page flow (revamped: popups removed)

Same-tab flow: frontend → `GET /api/auth/google` → Google → backend
`/google/callback` → find-or-create by verified email → JWT pair →
302 to `{frontend}/oauth/callback?code=<one-time>` → frontend exchanges via
`POST /api/auth/oauth/exchange` → dashboard. Stateless, `state:true` CSRF via
Redis StateStore (carries return origin, any localhost port), structured logs
(`oauth google start/callback ok/fail`, `oauth exchange ok/invalid`).

Previous iterations (popup + postMessage, GitHub) removed: popup delivery
across the :5000↔:517x origin split plus opener loss in Brave/Firefox made it
unreliable. GitHub strategy + `passport-github2` dep removed.

Original plan (kept for reference):

Stateless Authorization Code Flow, no server sessions:
- `backend/src/oauth.js` — passport `passport-google-oauth20` (scopes
  `profile+email`) + `passport-github2` (scope `user:email`), both with
  `session:false` and `state:true` via Redis-backed `StateStore` (CSRF-safe).
- Verify callback: find-by-verified-email → `linkProvider()` or
  `createUser({passwordHash:null})` → `issuePair()` (15m access + 30d rotating refresh).
- Callback mints a one-time code (Redis 5 min); frontend exchanges it at
  `POST /api/auth/oauth/exchange` — tokens never touch URLs/history.
  Popup uses `postMessage(code)` with full-redirect fallback to `/oauth/callback`.
- Auth: `POST /auth/refresh` rotates (reuse → family revoked, 401),
  `POST /auth/logout` revokes family, Day12 password policy enforced.

Original plan (kept for reference):

1. `npm i passport passport-google-oauth20 passport-github2 express-session`
2. Strategies with `callbackURL: /api/auth/google/callback`, `/github/callback`.
3. Verify callback: `findUserByEmail(profile.email)` → if exists, `linkProvider(id, provider, profile.id)`; else `createUser({passwordHash: null, provider, providerId})`.
4. `sign(user)` JWT as today. Store OAuth `refreshToken` in Redis (Phase 2).
5. Env: `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET`, `OAUTH_CALLBACK_BASE`.
6. Frontend: "Continue with Google/GitHub" buttons → popup → exchange code → save JWT.
