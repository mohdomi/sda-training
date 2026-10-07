# DB Plan — Postgres-only + Redis

## Why not hybrid Mongo+Postgres (Day10)
Dual connections, no cross-DB transactions, 2x migrations/backups, auth in one DB + domain in other = fan-out per request. Fine for learning, bad for MVP velocity.

## Target
- **Postgres (primary):** `users`, `tasks` (+ `ai_logs JSONB`). One ACID store, FK `tasks.user_id → users.id`.
- **Redis (ephemeral):** refresh-token blacklist, OAuth state/nonce, AI cache 5m TTL, rate-limit counters.
- **MVP now:** `backend/src/db/fileStore.js` implements `createUser/findUserByEmail/findUserById/linkProvider/createTask/listTasks/updateTask/deleteTask`. Postgres adapter will implement the same 7 methods; routes stay untouched.

## Migration (Phase 2)
1. `docker compose` enable postgres+redis (see devops/docker-compose.yml comments).
2. Add `backend/src/db/migrations/001_init.sql` (schema in postgres.js header).
3. Implement `PostgresStore` with `pg.Pool`, flip `DB_ADAPTER=postgres`.
