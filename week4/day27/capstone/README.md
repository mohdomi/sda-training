# SDA Capstone — AI-Powered Task Management (MVP)

Web-only MVP in `week4/day27/capstone/`. Target data layer: **Postgres-only + Redis** (Phase 2).

## Quickstart
1. `cp .env.example .env` — key already saved in local `.env` (gitignored).
2. Backend: `cd backend && npm install && npm run dev` → :5000
3. Frontend: `cd frontend && npm install && npm run dev` → :5173 (proxies /api)
4. Register at `/register`, then use Tasks + AI Assistant.

## AI
OpenRouter free model `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` (fallback `liquid/lfm-2.5-2.6b:free`), mock fallback if quota/key fails so demo never dies. See `backend/src/services/aiService.js`.

## DB plan
MVP `DB_ADAPTER=file` (JSON). Phase 2 switches to Postgres-only + Redis via same `store` interface — see `docs/DB_PLAN.md`, `backend/src/db/postgres.js` stub.

## OAuth
Stubs at `GET /api/auth/oauth/status`. Phase 2: passport Google/GitHub find-or-create by email. See `docs/OAUTH_PLAN.md`.
