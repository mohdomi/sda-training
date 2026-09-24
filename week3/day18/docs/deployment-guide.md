# Deployment Guide — Day 14 API

Deploys the backend (`server/`), its data layer, and nginx from this folder
(`week2/day14/`). Two paths: **Docker (recommended)** and **bare-metal + PM2**.

## 1. Prerequisites

- Node.js 22+, Docker + Docker Compose v2 (for the Docker path)
- A domain pointing at the host (for SSL)
- `server/.env` created from the example (never commit it):

```bash
cp server/.env.example server/.env
# then set at minimum:
#   JWT_SECRET=<long random string, e.g. openssl rand -base64 48>
#   FRONTEND_URL=https://your-domain.com
#   POSTGRES_PASSWORD=<strong password>
```

## 2. Docker deployment (recommended)

```bash
# Build + start everything (API, mongo, postgres, redis, nginx)
POSTGRES_PASSWORD=<same as in server/.env> \
  docker compose -f docker-compose.prod.yml up -d --build

# Run Postgres migrations inside the app container
docker compose -f docker-compose.prod.yml exec app npm run migrate

# Follow logs / check health
docker compose -f docker-compose.prod.yml logs -f app
curl http://localhost/health
```

What each piece does (see files for details):

- `server/Dockerfile` — two-stage build: `deps` stage runs `npm ci
  --only=production` (cached until manifests change), `runner` stage copies
  `node_modules` + source, runs as non-root `nodejs`, one process per
  container (`CLUSTER=false`; scale with `--scale app=3`).
- `docker-compose.prod.yml` — only **nginx** publishes ports (80/443). DBs
  live on the internal `data` network; the app waits on their healthchecks.
  Service names are DNS names inside compose, hence the `MONGODB_URI`,
  `POSTGRES_HOST`, `REDIS_URL` overrides.
- `nginx.conf` — reverse proxy: forwards to `app:3000` with
  `X-Real-IP`/`X-Forwarded-For` so the rate limiter and monitoring logs see
  real client IPs (without this, everything looks like one IP and rate
  limiting misfires).

Scale out: `docker compose -f docker-compose.prod.yml up -d --scale app=3`
(nginx load-balances the `api` upstream).

## 3. Frontend (static)

```bash
cd frontend
cp .env.example .env   # VITE_API_URL=https://your-domain.com/api/v1
npm install && npm run build   # -> frontend/dist/
```

Serve `dist/` from any static host (or copy into an nginx `html/` dir and add
a `location /` static block). No server-side runtime needed.

## 4. Bare-metal + PM2 (alternative, no Docker)

```bash
# system services (Ubuntu example)
sudo apt install mongodb postgresql redis  # or use managed services
cd server && npm ci --only=production
npm run migrate
npm install -g pm2
pm2 start index.js --name day14-api
pm2 install pm2-logrotate
pm2 startup && pm2 save
```

## 5. Nginx + SSL (bare-metal or standalone)

Use `nginx.conf` as a starting point (`proxy_pass http://localhost:3000`
when Node runs on the host). Then:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

Certbot inserts the 443 block (a commented template ships in `nginx.conf`).

## 6. Backups

```bash
# MongoDB (users, notifications)
mongodump --uri="$MONGODB_URI" --out "/backup/mongo_$(date +%F)"

# PostgreSQL (products, orders)
pg_dump "postgresql://postgres:$POSTGRES_PASSWORD@localhost:5432/sda_training" \
  > "/backup/pg_$(date +%F).sql"
```

Automate both via cron daily; test restores quarterly — an untested backup
is not a backup.

## 7. Security checklist

- [ ] `JWT_SECRET` is long/random and identical across scaled `app` replicas
- [ ] `server/.env` never committed; prod secrets injected, not baked into images
- [ ] Only nginx publishes ports; DBs unreachable from the internet
- [ ] `FRONTEND_URL` set to the real origin (CORS + Socket.IO allowlist)
- [ ] Public `/auth/register` cannot mint admins (currently it accepts `role`
      — strip it before public launch, promote via `PUT /users/:id`)
- [ ] Rate limiting active (`/api/` general limiter; consider `loginLimiter`
      on `/auth/login`)
- [ ] Helmet headers on; nginx adds a second layer
- [ ] SSL issued + HTTP→HTTPS redirect; `X-Forwarded-Proto` honored
- [ ] Backups scheduled **and** restore-tested
- [ ] `/health` watched by uptime monitor; `/health/metrics` + `logs/` wired
      into your log aggregator
