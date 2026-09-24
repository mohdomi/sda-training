# Day 18: CI/CD Pipeline

## 🎯 Learning Objectives

- Master CI/CD concepts and GitHub Actions
- Implement automated testing and deployment
- Create multi-environment deployment pipelines
- Set up automated security scanning and code quality checks
- Implement rollback and recovery procedures

## 📚 Theory & Concepts

### CI/CD Fundamentals
- **Continuous Integration**: Automated testing and building
- **Continuous Deployment**: Automated deployment to environments
- **Pipeline Stages**: Build, test, deploy, monitor
- **Environment Promotion**: Dev → Staging → Production
- **Rollback Strategies**: Quick recovery from failures

### GitHub Actions
- **Workflows**: Automated CI/CD processes
- **Jobs**: Parallel execution units
- **Steps**: Individual tasks within jobs
- **Secrets**: Secure environment variables
- **Artifacts**: Build outputs and dependencies

### Best Practices
- **Fast Feedback**: Quick test execution
- **Security**: Secure secrets and permissions
- **Monitoring**: Pipeline health and performance
- **Documentation**: Clear pipeline documentation
- **Maintenance**: Regular pipeline updates

## 🛠️ Hands-on Tasks

### Task 1: Create GitHub Actions Workflow
Implement comprehensive CI/CD pipeline:

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

env:
  NODE_VERSION: '18'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # Code Quality and Testing
  test:
    name: Test and Quality Checks
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:5.0
        ports:
          - 27017:27017
        options: >-
          --health-cmd "mongosh --eval 'db.adminCommand(\"ping\")'"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      postgresql:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: sda_training_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:6.0-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run linting
      run: npm run lint

    - name: Run type checking
      run: npm run type-check

    - name: Run unit tests
      run: npm run test:unit
      env:
        NODE_ENV: test
        MONGODB_URI: mongodb://localhost:27017/sda_training_test
        POSTGRES_URL: postgresql://postgres:postgres@localhost:5432/sda_training_test
        REDIS_URL: redis://localhost:6379

    - name: Run integration tests
      run: npm run test:integration
      env:
        NODE_ENV: test
        MONGODB_URI: mongodb://localhost:27017/sda_training_test
        POSTGRES_URL: postgresql://postgres:postgres@localhost:5432/sda_training_test
        REDIS_URL: redis://localhost:6379

    - name: Run security audit
      run: npm audit --audit-level moderate

    - name: Upload test results
      uses: actions/upload-artifact@v4
      if: always()
      with:
        name: test-results
        path: test-results/

  # Security Scanning
  security:
    name: Security Scanning
    runs-on: ubuntu-latest
    needs: test
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Run Trivy vulnerability scanner
      uses: aquasecurity/trivy-action@master
      with:
        scan-type: 'fs'
        scan-ref: '.'
        format: 'sarif'
        output: 'trivy-results.sarif'

    - name: Upload Trivy scan results
      uses: github/codeql-action/upload-sarif@v3
      with:
        sarif_file: 'trivy-results.sarif'

    - name: Run CodeQL Analysis
      uses: github/codeql-action/analyze@v3
      with:
        languages: javascript

  # Build and Push Docker Image
  build:
    name: Build and Push Docker Image
    runs-on: ubuntu-latest
    needs: [test, security]
    if: github.event_name == 'push'
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3

    - name: Log in to Container Registry
      uses: docker/login-action@v3
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}

    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v5
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=sha,prefix={{branch}}-
          type=raw,value=latest,enable={{is_default_branch}}

    - name: Build and push Docker image
      uses: docker/build-push-action@v5
      with:
        context: .
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max

  # Deploy to Staging
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/develop'
    environment: staging
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup kubectl
      uses: azure/setup-kubectl@v3
      with:
        version: 'latest'

    - name: Configure kubectl
      run: |
        echo "${{ secrets.KUBE_CONFIG_STAGING }}" | base64 -d > kubeconfig
        export KUBECONFIG=kubeconfig

    - name: Deploy to staging
      run: |
        kubectl apply -f k8s/namespace.yaml
        kubectl apply -f k8s/configmap.yaml
        kubectl apply -f k8s/secret.yaml
        kubectl apply -f k8s/deployment.yaml
        kubectl apply -f k8s/service.yaml
        kubectl apply -f k8s/ingress.yaml
        kubectl rollout status deployment/sda-training-app -n sda-training

    - name: Run smoke tests
      run: |
        kubectl get pods -n sda-training
        kubectl get services -n sda-training
        kubectl get ingress -n sda-training

  # Deploy to Production
  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: deploy-staging
    if: github.ref == 'refs/heads/main'
    environment: production
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup kubectl
      uses: azure/setup-kubectl@v3
      with:
        version: 'latest'

    - name: Configure kubectl
      run: |
        echo "${{ secrets.KUBE_CONFIG_PRODUCTION }}" | base64 -d > kubeconfig
        export KUBECONFIG=kubeconfig

    - name: Deploy to production
      run: |
        kubectl apply -f k8s/namespace.yaml
        kubectl apply -f k8s/configmap.yaml
        kubectl apply -f k8s/secret.yaml
        kubectl apply -f k8s/deployment.yaml
        kubectl apply -f k8s/service.yaml
        kubectl apply -f k8s/ingress.yaml
        kubectl rollout status deployment/sda-training-app -n sda-training

    - name: Run production tests
      run: |
        kubectl get pods -n sda-training
        kubectl get services -n sda-training
        kubectl get ingress -n sda-training

    - name: Notify deployment
      uses: 8398a7/action-slack@v3
      with:
        status: ${{ job.status }}
        channel: '#deployments'
        webhook_url: ${{ secrets.SLACK_WEBHOOK }}
      if: always()

  # Rollback
  rollback:
    name: Rollback Deployment
    runs-on: ubuntu-latest
    if: failure()
    needs: [deploy-staging, deploy-production]
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup kubectl
      uses: azure/setup-kubectl@v3
      with:
        version: 'latest'

    - name: Configure kubectl
      run: |
        echo "${{ secrets.KUBE_CONFIG_PRODUCTION }}" | base64 -d > kubeconfig
        export KUBECONFIG=kubeconfig

    - name: Rollback deployment
      run: |
        kubectl rollout undo deployment/sda-training-app -n sda-training
        kubectl rollout status deployment/sda-training-app -n sda-training

    - name: Notify rollback
      uses: 8398a7/action-slack@v3
      with:
        status: ${{ job.status }}
        channel: '#deployments'
        webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Task 2: Create Environment-Specific Workflows
Implement environment-specific deployment:

```yaml
# .github/workflows/deploy-staging.yml
name: Deploy to Staging

on:
  push:
    branches: [ develop ]
  workflow_dispatch:

env:
  ENVIRONMENT: staging
  NAMESPACE: sda-training-staging

jobs:
  deploy:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    environment: staging
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup kubectl
      uses: azure/setup-kubectl@v3

    - name: Configure kubectl
      run: |
        echo "${{ secrets.KUBE_CONFIG_STAGING }}" | base64 -d > kubeconfig
        export KUBECONFIG=kubeconfig

    - name: Update image tag
      run: |
        sed -i "s|image: sda-training:latest|image: sda-training:${{ github.sha }}|g" k8s/deployment.yaml

    - name: Deploy to staging
      run: |
        kubectl apply -f k8s/namespace.yaml
        kubectl apply -f k8s/configmap.yaml
        kubectl apply -f k8s/secret.yaml
        kubectl apply -f k8s/deployment.yaml
        kubectl apply -f k8s/service.yaml
        kubectl apply -f k8s/ingress.yaml

    - name: Wait for deployment
      run: |
        kubectl rollout status deployment/sda-training-app -n ${{ env.NAMESPACE }}

    - name: Run health checks
      run: |
        kubectl get pods -n ${{ env.NAMESPACE }}
        kubectl get services -n ${{ env.NAMESPACE }}
        kubectl get ingress -n ${{ env.NAMESPACE }}

    - name: Run integration tests
      run: |
        kubectl port-forward service/sda-training-service 3000:3000 -n ${{ env.NAMESPACE }} &
        sleep 10
        curl -f http://localhost:3000/health || exit 1
```

### Task 3: Create Security Scanning Workflow
Implement comprehensive security scanning:

```yaml
# .github/workflows/security.yml
name: Security Scanning

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]
  schedule:
    - cron: '0 2 * * 1' # Weekly on Monday at 2 AM

jobs:
  security-scan:
    name: Security Scanning
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Run Trivy vulnerability scanner
      uses: aquasecurity/trivy-action@master
      with:
        scan-type: 'fs'
        scan-ref: '.'
        format: 'sarif'
        output: 'trivy-results.sarif'

    - name: Upload Trivy scan results
      uses: github/codeql-action/upload-sarif@v3
      with:
        sarif_file: 'trivy-results.sarif'

    - name: Run CodeQL Analysis
      uses: github/codeql-action/analyze@v3
      with:
        languages: javascript

    - name: Run Snyk security scan
      uses: snyk/actions/node@master
      env:
        SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
      with:
        args: --severity-threshold=high

    - name: Run OWASP ZAP baseline scan
      uses: zaproxy/action-baseline@v0.7.0
      with:
        target: 'http://localhost:3000'
        rules_file_name: '.zap/rules.tsv'
        cmd_options: '-a'

    - name: Run dependency check
      uses: dependency-check/Dependency-Check_Action@main
      with:
        project: 'sda-training'
        path: '.'
        format: 'SARIF'
        out: 'dependency-check-report.sarif'

    - name: Upload dependency check results
      uses: github/codeql-action/upload-sarif@v3
      with:
        sarif_file: 'dependency-check-report.sarif'
```

### Task 4: Create Performance Testing Workflow
Implement performance and load testing:

```yaml
# .github/workflows/performance.yml
name: Performance Testing

on:
  push:
    branches: [ main, develop ]
  workflow_dispatch:

jobs:
  performance-test:
    name: Performance Testing
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'

    - name: Install dependencies
      run: npm ci

    - name: Start application
      run: |
        npm start &
        sleep 30

    - name: Run Lighthouse CI
      uses: treosh/lighthouse-ci-action@v10
      with:
        configPath: './lighthouse.config.js'
        uploadArtifacts: true
        temporaryPublicStorage: true

    - name: Run Artillery load testing
      run: |
        npm install -g artillery
        artillery run artillery.config.yml

    - name: Run K6 load testing
      run: |
        docker run --rm -v $(pwd):/scripts loadimpact/k6 run /scripts/k6-load-test.js

    - name: Generate performance report
      run: |
        echo "Performance test completed"
        echo "Results available in artifacts"
```

### Task 5: Create Monitoring and Alerting
Implement comprehensive monitoring:

```yaml
# .github/workflows/monitoring.yml
name: Monitoring and Alerting

on:
  schedule:
    - cron: '*/5 * * * *' # Every 5 minutes
  workflow_dispatch:

jobs:
  monitor:
    name: Monitor Application Health
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup kubectl
      uses: azure/setup-kubectl@v3

    - name: Configure kubectl
      run: |
        echo "${{ secrets.KUBE_CONFIG_PRODUCTION }}" | base64 -d > kubeconfig
        export KUBECONFIG=kubeconfig

    - name: Check pod health
      run: |
        kubectl get pods -n sda-training
        kubectl describe pods -n sda-training

    - name: Check service health
      run: |
        kubectl get services -n sda-training
        kubectl get ingress -n sda-training

    - name: Check resource usage
      run: |
        kubectl top pods -n sda-training
        kubectl top nodes

    - name: Check logs for errors
      run: |
        kubectl logs -l app=sda-training -n sda-training --tail=100

    - name: Send alert if unhealthy
      if: failure()
      uses: 8398a7/action-slack@v3
      with:
        status: ${{ job.status }}
        channel: '#alerts'
        webhook_url: ${{ secrets.SLACK_WEBHOOK }}
        fields: repo,message,commit,author,action,eventName,ref,workflow
```

## 📝 Documentation Tasks

### Create CI/CD Guide
Create `week3/day18/docs/cicd-guide.md`:

```markdown
# CI/CD Guide

## Pipeline Stages
- **Build**: Compile and package application
- **Test**: Unit, integration, and end-to-end tests
- **Security**: Vulnerability scanning and code analysis
- **Deploy**: Automated deployment to environments
- **Monitor**: Health checks and performance monitoring

## Best Practices
- **Fast Feedback**: Quick test execution and feedback
- **Security**: Secure secrets and permissions
- **Monitoring**: Pipeline health and performance
- **Documentation**: Clear pipeline documentation
- **Maintenance**: Regular pipeline updates and improvements
```

## 🧪 Testing & Validation

### Pipeline Testing
- [ ] All pipeline stages work correctly
- [ ] Tests run successfully
- [ ] Security scanning works
- [ ] Deployment works
- [ ] Monitoring works

### Performance Testing
- [ ] Pipeline execution time is acceptable
- [ ] Resource usage is reasonable
- [ ] Tests run efficiently
- [ ] Deployment is fast
- [ ] Monitoring is responsive

## 📊 Success Criteria

By the end of Day 18, you should have:

✅ **CI/CD Mastery**: Automated testing and deployment  
✅ **Security Scanning**: Comprehensive security checks  
✅ **Performance Testing**: Load and performance testing  
✅ **Monitoring**: Health checks and alerting  
✅ **Documentation**: Complete pipeline documentation  

## 🔄 Next Steps

1. **Commit your work**: `git add . && git commit -m "Complete Day 18: CI/CD Pipeline"`
2. **Create PR**: Submit pull request for code review
3. **Prepare for Day 19**: Review React Native concepts
4. **Update progress**: Document your learning in the daily summary

## ✅ Implementation Notes (this repo)

- **Task 1 (CI/CD pipeline)**: Created `.github/workflows/ci-cd.yml` verbatim from spec (test → security → build → deploy-staging → deploy-production → rollback). Test job provisions mongo:5.0, postgres:13, redis:6.0-alpine services; build pushes to GHCR with Buildx + GHA cache; staging/prod deploy via `azure/setup-kubectl` + `k8s/*.yaml` + `rollout status`; Slack notify on prod deploy/rollback.
- **Task 2 (Staging workflow)**: Created `.github/workflows/deploy-staging.yml` verbatim from spec (push to `develop` + `workflow_dispatch`, `sed` image tag to `${{ github.sha }}`, port-forward + `curl -f /health` check).
- **Task 3 (Security workflow)**: Created `.github/workflows/security.yml` verbatim from spec (Trivy fs → SARIF upload, CodeQL javascript, Snyk high-threshold, OWASP ZAP baseline against `.zap/rules.tsv`, OWASP Dependency-Check → SARIF upload; weekly Monday 02:00 cron).
- **Task 4 (Performance workflow)**: Created `.github/workflows/performance.yml` verbatim from spec (Lighthouse CI via `./lighthouse.config.js`, Artillery via `artillery.config.yml`, k6 via `k6-load-test.js`).
- **Task 5 (Monitoring workflow)**: Created `.github/workflows/monitoring.yml` verbatim from spec (5-min cron: pod/service/resource/log checks in `sda-training`, Slack `#alerts` on failure).
- **Docs**: Created `docs/cicd-guide.md` per spec.
- **Gap-fill (referenced by workflows but missing from spec)**: Added `lighthouse.config.js` (collects `/health`, perf/a11y ≥ 0.8), `artillery.config.yml` (warm-up 5 rps/60s + sustained 10 rps/120s against `/health` and `/api/v1/products`), `k6-load-test.js` (10→20 VUs ramp on `/health`), `.zap/rules.tsv` (baseline ignore rules). Targets use existing public `GET /health`; nothing in `server/`, `frontend/`, `k8s/`, `docker-compose*.yml`, `nginx.conf`, `monitoring/`, `scripts/`, existing `docs/` was changed.
- **Repo-wiring caveats (spec assumes repo root = app root)**: `npm ci` / `npm run lint|type-check|test:unit|test:integration` / `npm start` / Docker `context: .` run at the checkout root — this day folder has `server/` (`test`, `test:e2e`) + `frontend/` (`lint`) and `server/Dockerfile`, no root `package.json`/`Dockerfile`, so either add root scripts delegating to the two packages or set `working-directory: server|frontend` and `context: ./server`. GitHub only runs `.github/` at the repository root, so these day-scoped workflows run once copied/moved to the repo root (adjust `k8s/` paths accordingly). Required secrets before first run: `KUBE_CONFIG_STAGING`, `KUBE_CONFIG_PRODUCTION`, `SLACK_WEBHOOK`, `SNYK_TOKEN`.

Validated: all 5 workflows + `artillery.config.yml` parse as valid YAML; `node --check lighthouse.config.js` OK; `k6-load-test.js` is ESM (k6 runtime) by design.

## ✅ Local Verification Fixes (kind `day18-test`, K8s v1.37.0)

Live-tested the Day 18 deploy sequence on a local kind cluster. The pipeline as specified failed at `0/3 pods` (`rollout status` timeout); fixes below are in the repo, verified to a green rollout:
- **Workflows apply storage + databases**: `ci-cd.yml` (staging + production jobs) and `deploy-staging.yml` now also apply `persistent-volume-claim.yaml`, `database-storage.yaml`, `mongodb/postgresql/redis-deployment.yaml`. Why: the Deployment mounts PVCs and the app dials `mongodb/postgresql/redis-service`, none of which the original sequence created (`FailedScheduling: pvc not found`).
- **`standard` StorageClass + `ReadWriteOnce`**: all PVCs moved off `storageClassName: nfs`. Why: the NFS PVs point at fictional `nfs-server.example.com` (`mount.nfs: Failed to resolve server`); dynamic provisioning works on kind and managed clouds, and local-path provisioners only support RWO. The static NFS `persistent-volume.yaml` is kept as the prod-with-NFS alternative.
- **Fixed mongo/postgres Service selector collision**: both Deployments/Services shared `component: database`, so each Service load-balanced across both databases. Now `component: mongodb` / `component: postgresql` end to end.
- **Added `k8s/redis-deployment.yaml`** (`redis:6.0-alpine` + `redis-service:6379`, `emptyDir` cache, `redis-cli ping` probes). Why: `REDIS_URL` pointed at a Service that had no manifest at all.
- **`imagePullPolicy: IfNotPresent`** on the app container. Why: `:latest` defaults to `Always`, which fails on clusters without registry access to the image; image built via `docker build -t sda-training:latest ./server` + `kind load docker-image`.
- **`ingressClassName: nginx`** on the Ingress. Why: without a class the controller ignores it (ADDRESS stayed empty); TLS/`letsencrypt-prod` annotations remain prod-only.
- **Live-only (not in repo)**: kind node has ~1.6 GB, so for this node only — `kubectl scale deploy/sda-training-app --replicas=1` and lowered memory requests (mongo/postgres 512→256Mi, redis 256→64Mi, app 256→128Mi). Repo keeps spec values for real clusters. Verified end to end: PVCs Bound via dynamic provisioning, `mongodb-service` DNS resolves from the app pod, app connects once mongo is Ready.
- **Two more manifest fixes found during live test**: (a) `mongodb-deployment.yaml` probes gained `timeoutSeconds: 10` — `mongosh` startup exceeds kubelet's 1s default exec timeout, so liveness killed mongo in a loop (`Unhealthy: command timed out`, 300+ probe failures, mongo never Ready). (b) `deployment.yaml` app env gained `POSTGRES_HOST/PORT/DB/USER/PASSWORD` — the server reads `POSTGRES_HOST` (default `localhost`), not `POSTGRES_URL`, so it dialled `127.0.0.1:5432` and crashed at startup.
- **Green proof**: `kubectl rollout status deployment/sda-training-app` → `successfully rolled out`; mongo/postgres/redis + app pods `1/1 Running`; `curl -f http://localhost:3000/health` (port-forwarded Service, the workflow's own integration-test step) → HTTP 200. Live-only scale for the 1.6 GB node: app replicas 3→2 (repo keeps 3). Ingress controller intentionally not installed here (environment-provided, like cert-manager); manifest is schema-valid with `ingressClassName: nginx`.

## 📚 Additional Resources

- [GitHub Actions](https://docs.github.com/en/actions)
- [CI/CD Best Practices](https://docs.github.com/en/actions/learn-github-actions)
- [Security Scanning](https://docs.github.com/en/code-security)
- [Performance Testing](https://docs.github.com/en/actions/learn-github-actions)

---

**Ready for Day 19? Check out [Day 19: React Native](../day19/README.md)!** 🚀
