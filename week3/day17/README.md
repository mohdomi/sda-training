# Day 17: Kubernetes Basics

## 🎯 Learning Objectives

- Master Kubernetes fundamentals and cluster management
- Deploy applications using pods, deployments, and services
- Implement service discovery and load balancing
- Create persistent storage with volumes and persistent volumes
- Set up monitoring and logging in Kubernetes

## 📚 Theory & Concepts

### Kubernetes Fundamentals
- **Cluster**: Master and worker nodes
- **Pods**: Smallest deployable units
- **Deployments**: Managing pod replicas
- **Services**: Network access to pods
- **Namespaces**: Resource isolation

### Core Components
- **API Server**: Kubernetes control plane
- **etcd**: Cluster state storage
- **Scheduler**: Pod placement decisions
- **Controller Manager**: Maintaining desired state
- **kubelet**: Node agent

### Networking
- **Service Discovery**: DNS-based service discovery
- **Load Balancing**: Traffic distribution
- **Ingress**: External access management
- **Network Policies**: Security and isolation
- **CNI**: Container network interface

## 🛠️ Hands-on Tasks

### Task 1: Create Kubernetes Manifests
Build comprehensive Kubernetes deployment:

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: sda-training
  labels:
    app: sda-training
    environment: production
```

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: sda-training-config
  namespace: sda-training
data:
  NODE_ENV: "production"
  PORT: "3000"
  API_BASE_URL: "http://sda-training-service:3000"
  LOG_LEVEL: "info"
  CORS_ORIGIN: "https://sda-training.com"
```

```yaml
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: sda-training-secrets
  namespace: sda-training
type: Opaque
data:
  JWT_SECRET: <base64-encoded-secret>
  MONGODB_URI: <base64-encoded-mongodb-uri>
  POSTGRES_URL: <base64-encoded-postgres-url>
  REDIS_URL: <base64-encoded-redis-url>
```

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sda-training-app
  namespace: sda-training
  labels:
    app: sda-training
    component: app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: sda-training
      component: app
  template:
    metadata:
      labels:
        app: sda-training
        component: app
    spec:
      containers:
      - name: app
        image: sda-training:latest
        ports:
        - containerPort: 3000
          name: http
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: sda-training-config
              key: NODE_ENV
        - name: PORT
          valueFrom:
            configMapKeyRef:
              name: sda-training-config
              key: PORT
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: sda-training-secrets
              key: JWT_SECRET
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: sda-training-secrets
              key: MONGODB_URI
        - name: POSTGRES_URL
          valueFrom:
            secretKeyRef:
              name: sda-training-secrets
              key: POSTGRES_URL
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: sda-training-secrets
              key: REDIS_URL
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        volumeMounts:
        - name: app-logs
          mountPath: /app/logs
        - name: app-uploads
          mountPath: /app/uploads
      volumes:
      - name: app-logs
        persistentVolumeClaim:
          claimName: app-logs-pvc
      - name: app-uploads
        persistentVolumeClaim:
          claimName: app-uploads-pvc
      restartPolicy: Always
```

### Task 2: Create Services and Ingress
Implement networking and external access:

```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: sda-training-service
  namespace: sda-training
  labels:
    app: sda-training
    component: app
spec:
  type: ClusterIP
  ports:
  - port: 3000
    targetPort: 3000
    protocol: TCP
    name: http
  selector:
    app: sda-training
    component: app
```

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: sda-training-ingress
  namespace: sda-training
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - sda-training.com
    - api.sda-training.com
    secretName: sda-training-tls
  rules:
  - host: sda-training.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: sda-training-service
            port:
              number: 3000
  - host: api.sda-training.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: sda-training-service
            port:
              number: 3000
```

### Task 3: Create Persistent Storage
Implement persistent data storage:

```yaml
# k8s/persistent-volume.yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: app-logs-pv
  labels:
    app: sda-training
    component: logs
spec:
  capacity:
    storage: 10Gi
  accessModes:
    - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain
  storageClassName: nfs
  nfs:
    server: nfs-server.example.com
    path: /exports/app-logs

---
apiVersion: v1
kind: PersistentVolume
metadata:
  name: app-uploads-pv
  labels:
    app: sda-training
    component: uploads
spec:
  capacity:
    storage: 50Gi
  accessModes:
    - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain
  storageClassName: nfs
  nfs:
    server: nfs-server.example.com
    path: /exports/app-uploads
```

```yaml
# k8s/persistent-volume-claim.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-logs-pvc
  namespace: sda-training
  labels:
    app: sda-training
    component: logs
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 10Gi
  storageClassName: nfs

---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-uploads-pvc
  namespace: sda-training
  labels:
    app: sda-training
    component: uploads
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 50Gi
  storageClassName: nfs
```

### Task 4: Create Database Deployments
Deploy MongoDB and PostgreSQL in Kubernetes:

```yaml
# k8s/mongodb-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mongodb
  namespace: sda-training
  labels:
    app: sda-training
    component: database
spec:
  replicas: 1
  selector:
    matchLabels:
      app: sda-training
      component: database
  template:
    metadata:
      labels:
        app: sda-training
        component: database
    spec:
      containers:
      - name: mongodb
        image: mongo:5.0
        ports:
        - containerPort: 27017
          name: mongodb
        env:
        - name: MONGO_INITDB_ROOT_USERNAME
          value: "admin"
        - name: MONGO_INITDB_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: sda-training-secrets
              key: MONGO_ROOT_PASSWORD
        - name: MONGO_INITDB_DATABASE
          value: "sda_training"
        volumeMounts:
        - name: mongodb-data
          mountPath: /data/db
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          exec:
            command:
            - mongosh
            - --eval
            - "db.adminCommand('ping')"
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - mongosh
            - --eval
            - "db.adminCommand('ping')"
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: mongodb-data
        persistentVolumeClaim:
          claimName: mongodb-data-pvc
      restartPolicy: Always

---
apiVersion: v1
kind: Service
metadata:
  name: mongodb-service
  namespace: sda-training
  labels:
    app: sda-training
    component: database
spec:
  type: ClusterIP
  ports:
  - port: 27017
    targetPort: 27017
    protocol: TCP
    name: mongodb
  selector:
    app: sda-training
    component: database
```

```yaml
# k8s/postgresql-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgresql
  namespace: sda-training
  labels:
    app: sda-training
    component: database
spec:
  replicas: 1
  selector:
    matchLabels:
      app: sda-training
      component: database
  template:
    metadata:
      labels:
        app: sda-training
        component: database
    spec:
      containers:
      - name: postgresql
        image: postgres:13
        ports:
        - containerPort: 5432
          name: postgresql
        env:
        - name: POSTGRES_DB
          value: "sda_training"
        - name: POSTGRES_USER
          value: "postgres"
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: sda-training-secrets
              key: POSTGRES_PASSWORD
        volumeMounts:
        - name: postgresql-data
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - postgres
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - pg_isready
            - -U
            - postgres
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: postgresql-data
        persistentVolumeClaim:
          claimName: postgresql-data-pvc
      restartPolicy: Always

---
apiVersion: v1
kind: Service
metadata:
  name: postgresql-service
  namespace: sda-training
  labels:
    app: sda-training
    component: database
spec:
  type: ClusterIP
  ports:
  - port: 5432
    targetPort: 5432
    protocol: TCP
    name: postgresql
  selector:
    app: sda-training
    component: database
```

### Task 5: Create Monitoring and Logging
Implement comprehensive monitoring:

```yaml
# k8s/monitoring.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus
  namespace: sda-training
  labels:
    app: sda-training
    component: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: sda-training
      component: monitoring
  template:
    metadata:
      labels:
        app: sda-training
        component: monitoring
    spec:
      containers:
      - name: prometheus
        image: prom/prometheus:latest
        ports:
        - containerPort: 9090
          name: prometheus
        volumeMounts:
        - name: prometheus-config
          mountPath: /etc/prometheus
        - name: prometheus-data
          mountPath: /prometheus
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
      volumes:
      - name: prometheus-config
        configMap:
          name: prometheus-config
      - name: prometheus-data
        persistentVolumeClaim:
          claimName: prometheus-data-pvc
      restartPolicy: Always

---
apiVersion: v1
kind: Service
metadata:
  name: prometheus-service
  namespace: sda-training
  labels:
    app: sda-training
    component: monitoring
spec:
  type: ClusterIP
  ports:
  - port: 9090
    targetPort: 9090
    protocol: TCP
    name: prometheus
  selector:
    app: sda-training
    component: monitoring
```

## 📝 Documentation Tasks

### Create Kubernetes Guide
Create `week3/day17/docs/kubernetes-guide.md`:

```markdown
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
```

## 🧪 Testing & Validation

### Kubernetes Testing
- [ ] All pods start correctly
- [ ] Services work properly
- [ ] Ingress routes traffic correctly
- [ ] Persistent volumes work
- [ ] Health checks work

### Performance Testing
- [ ] Pod startup time is acceptable
- [ ] Resource usage is within limits
- [ ] Network performance is good
- [ ] Storage performance is acceptable
- [ ] Monitoring works correctly

## 📊 Success Criteria

By the end of Day 17, you should have:

✅ **Kubernetes Mastery**: Cluster management and deployment  
✅ **Service Discovery**: Network access and load balancing  
✅ **Persistent Storage**: Data persistence and volumes  
✅ **Monitoring**: Health checks and metrics  
✅ **Security**: Network policies and RBAC  

## 🔄 Next Steps

1. **Commit your work**: `git add . && git commit -m "Complete Day 17: Kubernetes Basics"`
2. **Create PR**: Submit pull request for code review
3. **Prepare for Day 18**: Review CI/CD pipeline concepts
4. **Update progress**: Document your learning in the daily summary

## ✅ Implementation Notes (this repo)

- **Task 1 (Manifests)**: Created `k8s/namespace.yaml`, `k8s/configmap.yaml`, `k8s/deployment.yaml` verbatim from spec. `k8s/secret.yaml` fills the spec's `<base64-encoded-...>` placeholders with placeholder base64 values (replace via `echo -n '<value>' | base64` before applying); added `MONGO_ROOT_PASSWORD` + `POSTGRES_PASSWORD` keys because Task 4 Deployments reference them but the spec's Secret template omits them.
- **Task 2 (Service/Ingress)**: Created `k8s/service.yaml`, `k8s/ingress.yaml` verbatim from spec. Requires ingress-nginx + cert-manager (`letsencrypt-prod`) for TLS/annotations to work.
- **Task 3 (Storage)**: Created `k8s/persistent-volume.yaml`, `k8s/persistent-volume-claim.yaml` verbatim from spec (NFS `app-logs` 10Gi + `app-uploads` 50Gi). Requires an NFS provisioner or replace `storageClassName: nfs`.
- **Task 4 (Databases)**: Created `k8s/mongodb-deployment.yaml` (mongo:5.0), `k8s/postgresql-deployment.yaml` (postgres:13) verbatim from spec, each with its ClusterIP Service. Added `k8s/database-storage.yaml` (`mongodb-data-pvc` 20Gi, `postgresql-data-pvc` 20Gi) — referenced by the Deployments but missing from the spec.
- **Task 5 (Monitoring)**: Created `k8s/monitoring.yaml` verbatim from spec. Added `k8s/prometheus-config.yaml` (`prometheus-config` ConfigMap) + `prometheus-data-pvc` in `k8s/database-storage.yaml` — both referenced by the Deployment but missing from the spec. Scrape target adapted to `sda-training-service:3000/health` (public liveness route; `/metrics` in this repo is admin-only per `server/routes/api/v1/healthRoutes.js`).
- **Docs**: Created `docs/kubernetes-guide.md` per spec.
- **Untouched**: `server/`, `frontend/`, `docker-compose*.yml`, `nginx.conf`, `monitoring/`, `scripts/`, existing `docs/` kept as-is. Probes use existing public `GET /health`; image `sda-training:latest` built from `server/Dockerfile` via `docker build -t sda-training:latest ./server`.

Validated: all 13 `k8s/*.yaml` parse as valid YAML; all `secretKeyRef` keys, `claimName`s, and ConfigMap refs resolve.

## 📚 Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Kubernetes Best Practices](https://kubernetes.io/docs/concepts/)
- [Kubernetes Security](https://kubernetes.io/docs/concepts/security/)
- [Kubernetes Monitoring](https://kubernetes.io/docs/tasks/debug-application-cluster/resource-usage-monitoring/)

---

**Ready for Day 18? Check out [Day 18: CI/CD Pipeline](../day18/README.md)!** 🚀
