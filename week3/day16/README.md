# Day 16: Docker & Compose

## 🎯 Learning Objectives

- Master Docker containerization and multi-service orchestration
- Build production-ready Docker images with optimization
- Implement Docker Compose for local development
- Create multi-service applications with proper networking
- Optimize Docker performance and security

## 📚 Theory & Concepts

### Docker Fundamentals
- **Containers**: Lightweight, portable application packaging
- **Images**: Immutable templates for containers
- **Dockerfile**: Instructions for building images
- **Registry**: Storage and distribution of images
- **Networking**: Container communication and networking

### Docker Compose
- **Multi-Service**: Orchestrating multiple containers
- **Networking**: Service discovery and communication
- **Volumes**: Persistent data storage
- **Environment**: Development environment setup
- **Scaling**: Horizontal scaling of services

### Best Practices
- **Image Optimization**: Minimal image size and layers
- **Security**: Secure container configuration
- **Performance**: Optimized container performance
- **Networking**: Proper service communication
- **Monitoring**: Container health and performance

## 🛠️ Hands-on Tasks

### Task 1: Create Production-Ready Dockerfile
Build optimized Docker image for the application:

```dockerfile
# Dockerfile
# Multi-stage build for optimization
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production && npm cache clean --force

# Build stage
FROM base AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Create necessary directories
RUN mkdir -p logs && chown -R nodejs:nodejs logs
RUN mkdir -p uploads && chown -R nodejs:nodejs uploads

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start application
CMD ["node", "dist/index.js"]
```

### Task 2: Create Docker Compose Configuration
Implement comprehensive multi-service setup:

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Main application
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: runner
    ports:
      - "${PORT:-3000}:3000"
    environment:
      - NODE_ENV=${NODE_ENV:-production}
      - MONGODB_URI=mongodb://mongodb:27017/sda_training
      - POSTGRES_URL=postgresql://postgres:password@postgresql:5432/sda_training
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      mongodb:
        condition: service_healthy
      postgresql:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - app_logs:/app/logs
      - app_uploads:/app/uploads
    restart: unless-stopped
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "node", "healthcheck.js"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # MongoDB database
  mongodb:
    image: mongo:5.0
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=password
      - MONGO_INITDB_DATABASE=sda_training
    volumes:
      - mongodb_data:/data/db
      - ./scripts/mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js:ro
    restart: unless-stopped
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # PostgreSQL database
  postgresql:
    image: postgres:13
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=sda_training
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_INITDB_ARGS=--encoding=UTF-8 --lc-collate=C --lc-ctype=C
    volumes:
      - postgresql_data:/var/lib/postgresql/data
      - ./scripts/postgres-init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    restart: unless-stopped
    networks:
      - app-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Redis cache
  redis:
    image: redis:6.0-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Nginx reverse proxy
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - nginx_logs:/var/log/nginx
    depends_on:
      - app
    restart: unless-stopped
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Monitoring with Prometheus
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    restart: unless-stopped
    networks:
      - app-network

  # Monitoring with Grafana
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
    depends_on:
      - prometheus
    restart: unless-stopped
    networks:
      - app-network

volumes:
  mongodb_data:
  postgresql_data:
  redis_data:
  app_logs:
  app_uploads:
  nginx_logs:
  prometheus_data:
  grafana_data:

networks:
  app-network:
    driver: bridge
```

### Task 3: Create Nginx Configuration
Implement reverse proxy and load balancing:

```nginx
# nginx/nginx.conf
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

    # Upstream servers
    upstream app_servers {
        server app:3000;
        # Add more servers for load balancing
        # server app2:3000;
        # server app3:3000;
    }

    # Main server block
    server {
        listen 80;
        server_name localhost;

        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }

        # API endpoints
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            
            proxy_pass http://app_servers;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Timeouts
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }

        # Authentication endpoints
        location /api/auth/login {
            limit_req zone=login burst=5 nodelay;
            
            proxy_pass http://app_servers;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Static files
        location /static/ {
            alias /app/uploads/;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # Default location
        location / {
            proxy_pass http://app_servers;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }

    # HTTPS server block (if SSL certificates are available)
    server {
        listen 443 ssl http2;
        server_name localhost;

        # SSL configuration
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # Same location blocks as HTTP server
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }

        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://app_servers;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location / {
            proxy_pass http://app_servers;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

### Task 4: Create Monitoring Configuration
Implement comprehensive monitoring setup:

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'app'
    static_configs:
      - targets: ['app:3000']
    metrics_path: '/metrics'
    scrape_interval: 5s

  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx:80']
    metrics_path: '/nginx_status'

  - job_name: 'mongodb'
    static_configs:
      - targets: ['mongodb:27017']

  - job_name: 'postgresql'
    static_configs:
      - targets: ['postgresql:5432']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
```

### Task 5: Create Docker Optimization Scripts
Build performance optimization tools:

```bash
#!/bin/bash
# scripts/docker-optimize.sh

echo "🐳 Docker Optimization Script"
echo "========================="

# Clean up unused resources
echo "🧹 Cleaning up unused Docker resources..."
docker system prune -f
docker volume prune -f
docker network prune -f

# Build optimized images
echo "🏗️ Building optimized images..."
docker build --target runner -t sda-training:latest .

# Analyze image size
echo "📊 Analyzing image size..."
docker images sda-training:latest

# Security scan
echo "🔒 Running security scan..."
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image sda-training:latest

# Performance test
echo "⚡ Running performance test..."
docker run --rm -d --name perf-test sda-training:latest
sleep 10
docker stats perf-test --no-stream
docker stop perf-test

echo "✅ Optimization complete!"
```

## 📝 Documentation Tasks

### Create Docker Guide
Create `week3/day16/docs/docker-guide.md`:

```markdown
# Docker Guide

## Containerization Best Practices
- **Multi-stage Builds**: Optimize image size and build time
- **Security**: Use non-root users and minimal base images
- **Performance**: Optimize layers and caching
- **Networking**: Proper service communication
- **Monitoring**: Container health and performance tracking

## Docker Compose
- **Multi-Service**: Orchestrating multiple containers
- **Networking**: Service discovery and communication
- **Volumes**: Persistent data storage
- **Environment**: Development environment setup
- **Scaling**: Horizontal scaling of services
```

## 🧪 Testing & Validation

### Docker Testing
- [ ] All containers start correctly
- [ ] Services communicate properly
- [ ] Health checks work
- [ ] Volumes are mounted correctly
- [ ] Networking works between services

### Performance Testing
- [ ] Images are optimized
- [ ] Startup time is acceptable
- [ ] Memory usage is reasonable
- [ ] CPU usage is efficient
- [ ] Network performance is good

## 📊 Success Criteria

By the end of Day 16, you should have:

✅ **Docker Mastery**: Containerization and optimization  
✅ **Multi-Service**: Docker Compose orchestration  
✅ **Networking**: Service communication and discovery  
✅ **Monitoring**: Container health and performance  
✅ **Security**: Secure container configuration  

## 🔄 Next Steps

1. **Commit your work**: `git add . && git commit -m "Complete Day 16: Docker & Compose"`
2. **Create PR**: Submit pull request for code review
3. **Prepare for Day 17**: Review Kubernetes concepts
4. **Update progress**: Document your learning in the daily summary

## ✅ Implementation Notes (this repo)

- **Task 1 (Dockerfile)**: Already done via `server/Dockerfile` (kept as-is). Adaptation: `node:22-alpine`, `deps` + `runner` stages, non-root `nodejs` user, `HEALTHCHECK` via `wget http://localhost:3000/health`, `CMD ["node", "index.js"]`. Spec template assumes a `dist/` build which this plain-JS server does not have; added `server/healthcheck.js` (standalone `node healthcheck.js` probe) for spec parity without changing the working Dockerfile.
- **Task 2 (Compose)**: Already done via `docker-compose.yml` (dev data layer) + `docker-compose.prod.yml` (prod app + mongo + postgres + redis + nginx), both validated with `docker compose config`. Added only: `prometheus` + `grafana` services under `monitoring` profile (`--profile monitoring`), `prometheus_data`/`grafana_data` volumes.
- **Task 3 (Nginx)**: Extended `nginx.conf` in place (same mount path, same `upstream api`): added access/error logs, full gzip, `api` (10r/s) + `login` (5r/m) rate-limit zones, `location /api/` and `location = /api/auth/login` proxy blocks, `X-XSS-Protection` header. Existing `/` and `/health` proxy behavior unchanged.
- **Task 4 (Monitoring)**: Created `monitoring/prometheus.yml` + `monitoring/alert_rules.yml`. Note: app exposes liveness at `/health` (public) and detailed JSON at `/health/metrics` (admin-only), so prometheus scrapes `/health`; scrape of authenticated `/metrics` path from spec template does not apply.
- **Task 5 (Optimize script)**: Created `scripts/docker-optimize.sh` (prune, build `./server` runner target, image analysis, perf test).
- **Docs**: Created `docs/docker-guide.md` per spec.

Validated: `docker compose config` (dev + prod) OK, `node --check server/healthcheck.js` OK.

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Container Security](https://docs.docker.com/engine/security/)

---

**Ready for Day 17? Check out [Day 17: Kubernetes Basics](../day17/README.md)!** 🚀
