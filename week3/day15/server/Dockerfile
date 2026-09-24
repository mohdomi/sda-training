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

# Liveness = HTTP 200 from /health (it always returns 200 while the process
# serves). Do NOT grep for "healthy": that field is workload wellness
# (heap pressure), and conflating the two flaps the container needlessly.
# (busybox wget ships with node:22-alpine, so no extra packages needed.)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null http://localhost:3000/health

CMD ["node", "index.js"]
