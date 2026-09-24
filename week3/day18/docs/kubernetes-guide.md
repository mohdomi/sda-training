# Kubernetes Guide

## Core Concepts
- **Pods**: Smallest deployable units
- **Deployments**: Managing pod replicas
- **Services**: Network access to pods
- **Ingress**: External access management
- **Volumes**: Persistent data storage

## Best Practices
- **Resource Management**: CPU and memory limits
- **Health Checks**: Liveness and readiness probes
- **Security**: Network policies and RBAC
- **Monitoring**: Metrics and logging
- **Scaling**: Horizontal and vertical scaling

---

## Implementation Notes (this repo)

- Manifests: `k8s/` (`namespace.yaml`, `configmap.yaml`, `secret.yaml`,
  `deployment.yaml`, `service.yaml`, `ingress.yaml`,
  `persistent-volume.yaml`, `persistent-volume-claim.yaml`,
  `mongodb-deployment.yaml`, `postgresql-deployment.yaml`,
  `monitoring.yaml`).
- Supplements (not in spec, required for referential integrity):
  `k8s/database-storage.yaml` (`mongodb-data-pvc`, `postgresql-data-pvc`,
  `prometheus-data-pvc`), `k8s/prometheus-config.yaml`
  (`prometheus-config` ConfigMap scraped from `sda-training-service:3000/health`).
- `secret.yaml` uses placeholder base64 values — replace via
  `echo -n '<value>' | base64` before applying; added `MONGO_ROOT_PASSWORD`
  and `POSTGRES_PASSWORD` keys because the spec's database Deployments
  reference them but the spec's Secret template omits them.
- Probes hit `GET /health` (public liveness route in
  `server/routes/api/v1/healthRoutes.js`); `GET /health/metrics` stays
  admin-only and is not scraped.
- Deploy order: `kubectl apply -f k8s/namespace.yaml`,
  then ConfigMap/Secret/storage, then databases, app, monitoring, ingress.
  Requires an NFS provisioner (or replace `storageClassName: nfs`) and
  ingress-nginx + cert-manager (`letsencrypt-prod`) for the Ingress to work.
