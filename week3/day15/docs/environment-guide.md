# Environment Management Guide

## Environment Overview

### Development Environment
- **Purpose**: Local development and testing
- **Database**: Local MongoDB, PostgreSQL, Redis
- **Security**: Relaxed security for development
- **Logging**: Debug level logging
- **Port**: 3000

### Staging Environment
- **Purpose**: Production-like testing environment
- **Database**: Cloud databases with SSL
- **Security**: Production-like security
- **Logging**: Info level logging
- **Port**: 3000

### Production Environment
- **Purpose**: Live application environment
- **Database**: High-availability cloud databases
- **Security**: Maximum security configuration
- **Logging**: Warning level logging
- **Port**: 3000

## Environment Variables

### Required Variables
- `NODE_ENV`: Environment name (development/staging/production)
- `PORT`: Application port
- `MONGODB_URI`: MongoDB connection string
- `POSTGRES_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: JWT signing secret

### Optional Variables
- `API_BASE_URL`: API base URL
- `JWT_EXPIRES_IN`: JWT expiration time
- `BCRYPT_ROUNDS`: Bcrypt salt rounds
- `LOG_LEVEL`: Logging level

## Security Considerations

### Secrets Management
- Use environment variables for secrets
- Never commit secrets to version control
- Use encryption for sensitive data
- Rotate secrets regularly

### Database Security
- Use SSL connections in staging/production
- Implement connection pooling
- Use strong passwords
- Enable authentication

### Network Security
- Use HTTPS in production
- Implement CORS properly
- Use rate limiting
- Monitor for suspicious activity

---

## Implementation Notes (this repo)

- `server/config/environments.js` — `getEnvironment()` returns the
  `development` / `staging` / `production` block based on `NODE_ENV`.
  Dev has local fallbacks; staging/production require real env vars
  (SSL on, stricter JWT expiry, connection pooling in prod).
- `server/config/secrets.js` — `SecretsManager` (`validateSecrets()`,
  `getSecret(name, default)`, `encrypt()` / `decrypt()` with
  `aes-256-gcm`). Required: `JWT_SECRET`, `MONGODB_URI`,
  `POSTGRES_PASSWORD`, `REDIS_URL`.
- `server/monitoring/health-check.js` — `performHealthCheck()` probes
  MongoDB (mongoose `readyState`), Redis (`PING`), PostgreSQL
  (`SELECT NOW()`), plus `getSystemInfo()` (uptime/memory/loadavg).
- Live request monitoring already exists in
  `server/middleware/monitoring.js` (`MonitoringService`,
  `monitoringMiddleware`, `GET /health`, admin-only
  `GET /health/metrics`); the new `health-check.js` adds deep
  dependency probes alongside it.
- `docker-compose.yml` (local data layer) +
  `docker-compose.prod.yml` (app + mongo + postgres + redis + nginx,
  health-gated, DBs on an internal network) + `nginx.conf` cover the
  Task 3 infrastructure spec.
