# ---- deps: installed once, cached until manifests change ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

# ---- runner: minimal prod image (no devDeps, no build tools) ----
# Build context is ./server, WORKDIR mirrors local dev (code runs from server/).
FROM node:22-alpine AS runner
ENV NODE_ENV=production \
    CLUSTER=false \
    PORT=3000
WORKDIR /app

RUN addgroup -S nodejs && adduser -S nodejs -G nodejs \
  && mkdir -p /app/logs && chown -R nodejs:nodejs /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

USER nodejs
EXPOSE 3000

# Container is healthy when the public liveness probe reports healthy.
# (busybox wget ships with node:22-alpine, so no extra packages needed.)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3000/health | grep -q '"status":"healthy"'

CMD ["node", "index.js"]
