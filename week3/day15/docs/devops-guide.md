# DevOps Guide

## Environment Management
- **Multi-Environment**: Development, staging, production
- **Configuration**: Environment-specific settings
- **Secrets**: Secure secrets management
- **Infrastructure**: Infrastructure as code
- **Monitoring**: System health and performance

## Best Practices
- **Version Control**: Infrastructure and configuration versioning
- **Automation**: Automated deployment and testing
- **Security**: Secure configuration and secrets management
- **Monitoring**: Proactive system monitoring
- **Documentation**: Comprehensive operational documentation

---

## Implementation Notes (this repo)

- Config: `server/config/environments.js` (`getEnvironment()`),
  `server/config/secrets.js` (`SecretsManager`).
- Infrastructure: `docker-compose.yml` (dev data layer),
  `docker-compose.prod.yml` (prod: app + mongo + postgres + redis +
  nginx), `nginx.conf` (reverse proxy, real-IP headers, `/health`
  probe, commented 443/certbot block).
- Monitoring: `server/middleware/monitoring.js` (request metrics,
  winston `logs/combined.log` + `logs/error.log`) plus
  `server/monitoring/health-check.js` (DB/Redis/Postgres probes +
  system info). See `docs/environment-guide.md` and
  `docs/deployment-guide.md` for operations.
