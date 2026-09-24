# System Integration Guide — Day 14 (as built)

## Frontend ↔ Backend
- Base URL `VITE_API_URL` (`http://localhost:3000/api/v1`); all ids opaque strings.
- `services/api.js`: attaches `accessToken`, on 401 tries `POST /auth/refresh`
  once, else clears session and redirects to `/login`.
- Public reads: `GET /products`, `GET /products/:id`. Everything else needs a token.

## Authentication flow
1. `POST /auth/register` or `/auth/login` → `{ user, accessToken, refreshToken }`.
2. Client stores tokens + user in `localStorage` (`AuthContext`).
3. `authenticate` verifies JWT (issuer/audience) and loads the Mongoose user;
   `authorize('admin')` gates admin routes. Ownership checks compare the Mongo
   id string against Postgres `orders.user_id` / notification `userId`.
4. ⚠️ Open item: public register currently accepts `role` — strip before launch.

## Error conventions
- All errors: `{ success: false, error: { message, details?, stack? (dev) } }`.
- `400` validation (express-validator, id-type split: UUID vs MongoId),
  `401` missing/bad token, `403` wrong role/owner, `404` unknown id.

## Performance & caching
- Redis caches `GET /products*` and `GET /analytics` (60s/30s); writes are
  uncached reads-after-write via fresh queries. User-scoped routes are never
  cached with the default key (would leak across users).
- Rate limit: 100 req/15 min/IP on `/api/`.

## Testing
- `npm test` (needs Mongo + Postgres; `NODE_OPTIONS=--experimental-vm-modules`
  required — see Task 2 notes): API suite + `tests/e2e/integration.test.js`
  (register→order journey, error matrix, 10-way concurrency, <1s budget).

## Monitoring
- Every request timed by `monitoringMiddleware` → winston `logs/` +
  in-memory per-route aggregates. `GET /health` (public liveness),
  `GET /health/metrics` (admin: counts, avg durations, error rate, memory).
