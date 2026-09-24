# Docker Guide

## Containerization Best Practices
- **Multi-stage Builds**: `server/Dockerfile` uses `deps` + `runner` stages so prod image ships only `node_modules` (prod) + source, no devDeps or build tools.
- **Security**: Non-root `nodejs` user, `.dockerignore` excludes `.env`, `node_modules`, logs, tests, `.git`.
- **Performance**: `npm ci --only=production` cached until manifests change; `CLUSTER=false` in image (one process per container, scale via compose).
- **Networking**: Prod compose uses `web` (app + nginx) and `data` (app + mongo/postgres/redis) networks; DBs unpublished, only nginx exposes 80/443.
- **Monitoring**: Dockerfile `HEALTHCHECK` hits `http://localhost:3000/health`; compose healthchecks gate `app` startup on mongo/postgres/redis.

## Docker Compose
- **Multi-Service**: `docker-compose.yml` = dev data layer (mongo/postgres/redis with host ports). `docker-compose.prod.yml` = full prod stack (app + mongo + postgres + redis + nginx, plus optional `monitoring` profile for prometheus + grafana).
- **Networking**: Service names are DNS names (`mongo`, `postgres`, `redis`, `app`); app env overrides localhost defaults (`MONGODB_URI`, `POSTGRES_HOST`, `REDIS_URL`).
- **Volumes**: Named volumes `mongo_data`, `postgres_data`, `redis_data`, `app_logs` for persistence.
- **Environment**: `server/.env.example` -> `server/.env` (JWT_SECRET, FRONTEND_URL, POSTGRES_PASSWORD); prod compose also reads `POSTGRES_PASSWORD` from shell.
- **Scaling**: `docker compose -f docker-compose.prod.yml up -d --scale app=3` (nginx `upstream api` load-balances).

## Commands
```bash
docker compose up -d
POSTGRES_PASSWORD=<same-as-env> docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec app npm run migrate
docker compose -f docker-compose.prod.yml --profile monitoring up -d --build
curl http://localhost/health
bash scripts/docker-optimize.sh
```
