# Phase 5C Production Readiness - Remediation Checklist

Track progress on critical production readiness issues.

---

## 🔴 Phase 1: Critical (Must Fix Before Production)

### Security
- [ ] **1.1** Remove JWT secret default value (`backend/src/config/index.ts:35`)
  - [ ] Remove `'your-super-secret-jwt-key-change-in-production'` default
  - [ ] Add startup validation that throws if `JWT_SECRET` not set in production
  - [ ] Verify JWT_SECRET is 32+ chars, randomly generated

- [ ] **1.2** Implement Redis-backed rate limiter (`backend/src/middleware/rateLimiter.ts`)
  - [ ] Create `RedisRateLimiter` class using `ioredis` from config
  - [ ] Use sliding window or token bucket algorithm
  - [ ] Support per-user limits for authenticated routes
  - [ ] Add rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`)
  - [ ] Test with multiple backend instances

- [ ] **1.3** Fix SQL.js database persistence (`backend/src/database/initialize.ts`)
  - [ ] Add `PRAGMA journal_mode=WAL;` on init
  - [ ] Reduce save interval from 30s to 5s (or implement immediate save on critical writes)
  - [ ] Add `PRAGMA synchronous=NORMAL;` for better durability
  - [ ] Add graceful shutdown that waits for save completion

- [ ] **1.4** Puppeteer sandbox container detection (`backend/src/services/pdfExportHeadless.ts`)
  - [ ] Detect if running in container: `fs.existsSync('/.dockerenv')` or `process.env.CONTAINER`
  - [ ] Only add `--no-sandbox` and `--disable-setuid-sandbox` in containers
  - [ ] Document requirement for `--cap-add=SYS_ADMIN` in Docker

- [ ] **1.5** CORS production enforcement (`backend/src/index.ts:40-47`)
  - [ ] Throw error if `CORS_ORIGINS` not set in production
  - [ ] Validate origins are HTTPS in production

- [ ] **1.6** Cookie secure flag (`backend/src/config/index.ts:42`)
  - [ ] Change to `secure: true` (require HTTPS always)
  - [ ] Add `sameSite: 'strict'` for auth cookies

### Logging & Monitoring
- [ ] **1.7** Async logger with rotation (`backend/src/utils/logger.ts`)
  - [ ] Replace `fs.appendFileSync` with `fs.promises.appendFile`
  - [ ] Add log rotation: daily files, max 30 files, gzip compression
  - [ ] Use `pino` or `winston` for production-grade logging
  - [ ] Add log levels: error, warn, info, http, debug

- [ ] **1.8** Health check endpoints (`backend/src/index.ts`)
  - [ ] `GET /health/live` - process alive (kubernetes liveness)
  - [ ] `GET /health/ready` - DB, Redis, Forge, AI providers reachable (kubernetes readiness)
  - [ ] Return proper HTTP codes (200/503)

### Backup & Recovery
- [ ] **1.9** Automated database backup (`backend/scripts/backup-db.ts`)
  - [ ] Add timestamp to backup filename
  - [ ] Upload to S3/GCS with lifecycle policy
  - [ ] Add cron job (daily at 2 AM UTC)
  - [ ] Document restore procedure
  - [ ] Test restore monthly

- [ ] **1.10** Production startup validation
  - [ ] Create `backend/src/config/env.ts` with Zod schema
  - [ ] Validate all required env vars on startup
  - [ ] Fail fast with clear error messages

---

## 🟡 Phase 2: High (Should Fix Within 2 Weeks)

### Security
- [ ] **2.1** CSP headers (`backend/src/index.ts:37`)
  - [ ] Enable `contentSecurityPolicy` in helmet
  - [ ] Generate nonces for inline styles (handwriting CSS)
  - [ ] Allow `https://fonts.googleapis.com` for Google Fonts
  - [ ] Test all pages render correctly

- [ ] **2.2** File upload hardening (`backend/src/routes/index.ts:27-47`)
  - [ ] Validate MIME type AND extension
  - [ ] Sanitize filename (remove path traversal)
  - [ ] Store with UUID names only
  - [ ] Add virus scanning (ClamAV) if possible

- [ ] **2.3** API versioning
  - [ ] Prefix all routes with `/api/v1/`
  - [ ] Update frontend API base URL
  - [ ] Document versioning policy

### Performance
- [ ] **2.4** Redis caching for handwriting generation (`backend/src/services/handwritingGeneration.ts`)
  - [ ] Replace in-memory `HandwritingCache` with Redis-backed cache
  - [ ] Add cache TTL configuration
  - [ ] Add cache invalidation on profile update

- [ ] **2.5** Retry logic for external services
  - [ ] Forge client: exponential backoff (max 3 retries)
  - [ ] AI providers: retry on 429/5xx
  - [ ] Database: retry on `SQLITE_BUSY`

- [ ] **2.6** Prometheus metrics (`backend/src/middleware/metrics.ts` - new)
  - [ ] HTTP request duration histogram
  - [ ] HTTP request counter by status
  - [ ] Active generation jobs gauge
  - [ ] Browser pool metrics
  - [ ] Database query duration
  - [ ] `/metrics` endpoint

### Error Handling
- [ ] **2.7** React Error Boundaries (frontend)
  - [ ] Wrap app in ErrorBoundary
  - [ ] Friendly error UI with retry
  - [ ] Log errors to backend

- [ ] **2.8** Global unhandled rejection handler
  - [ ] `process.on('unhandledRejection')` - log and graceful shutdown
  - [ ] `process.on('uncaughtException')` - log and exit

### Logging
- [ ] **2.9** Structured logging with correlation IDs
  - [ ] Add `requestId` to all log entries (from header or generate)
  - [ ] Include `userId` when authenticated
  - [ ] Standard JSON fields: timestamp, level, message, service, requestId, userId

---

## 🟢 Phase 3: Medium (Technical Debt - Next Month)

### Infrastructure
- [ ] **3.1** Migrate from sql.js to PostgreSQL
  - [ ] Set up PostgreSQL (managed service preferred)
  - [ ] Update `backend/src/database/initialize.ts` to use `pg` or `knex` with pg
  - [ ] Run migrations
  - [ ] Test all queries

- [ ] **3.2** Object storage for uploads
  - [ ] Configure S3/GCS bucket
  - [ ] Update multer to upload directly to S3 (multer-s3)
  - [ ] Serve via CloudFront/CDN
  - [ ] Add signed URLs for private files

- [ ] **3.3** Container orchestration
  - [ ] Create `Dockerfile` (multi-stage)
  - [ ] Create `docker-compose.yml` for local dev
  - [ ] Create K8s manifests or Render/Fly config
  - [ ] Configure horizontal pod autoscaling

### Observability
- [ ] **3.4** Distributed tracing (OpenTelemetry)
  - [ ] Add `@opentelemetry/sdk-node`
  - [ ] Auto-instrument Express, Redis, HTTP
  - [ ] Export to Jaeger/Zipkin/Datadog

- [ ] **3.5** Alerting rules
  - [ ] Error rate > 1% for 5 min
  - [ ] P99 latency > 5s
  - [ ] Disk usage > 80%
  - [ ] Memory usage > 85%
  - [ ] Generation queue depth > 10

### Operations
- [ ] **3.6** Documentation
  - [ ] Deployment runbook
  - [ ] Rollback procedure
  - [ ] Incident response runbook
  - [ ] Disaster recovery plan (RPO/RTO)
  - [ ] On-call handoff guide

- [ ] **3.7** Load testing
  - [ ] k6 or artillery script
  - [ ] Test: 100 concurrent generations
  - [ ] Identify bottlenecks
  - [ ] Document capacity limits

- [ ] **3.8** Dependency audit
  - [ ] `npm audit fix` on both frontend/backend
  - [ ] Update outdated packages
  - [ ] Add `dependabot.yml` for automated PRs

---

## 📋 Quick Reference: Files to Modify

| File | Phase | Issue |
|------|-------|-------|
| `backend/src/config/index.ts` | 1 | JWT secret, cookie secure, CORS validation |
| `backend/src/middleware/rateLimiter.ts` | 1 | Redis-backed implementation |
| `backend/src/utils/logger.ts` | 1 | Async, rotation, structured |
| `backend/src/database/initialize.ts` | 1 | WAL mode, save interval |
| `backend/src/services/pdfExportHeadless.ts` | 1 | Container sandbox detection |
| `backend/src/index.ts` | 1 | CSP, health endpoints, startup validation |
| `backend/scripts/backup-db.ts` | 1 | S3 upload, retention, cron |
| `backend/src/config/env.ts` | 1 | **NEW** - Zod env schema |
| `backend/src/middleware/health.ts` | 1 | **NEW** - Ready/live endpoints |
| `backend/src/middleware/metrics.ts` | 2 | **NEW** - Prometheus metrics |
| `frontend/src/App.tsx` | 2 | Error Boundary wrapper |
| `Dockerfile` | 3 | **NEW** - Multi-stage build |
| `docker-compose.yml` | 3 | **NEW** - Local stack |
| `.github/workflows/ci.yml` | 3 | **NEW** - CI/CD pipeline |

---

## ✅ Definition of Done for Phase 1

- [ ] All 10 critical items checked off
- [ ] Application starts with only required env vars (no defaults in prod)
- [ ] Rate limiting works across multiple instances
- [ ] Logs are async, rotated, and structured JSON
- [ ] Database survives crash with < 5s data loss
- [ ] Health endpoints return correct status for k8s
- [ ] Backups run automatically and restore tested
- [ ] No `--no-sandbox` on bare metal
- [ ] CSP headers don't break handwriting rendering
- [ ] All secrets managed via env vars (no defaults)

---

## 📅 Suggested Timeline

| Week | Focus |
|------|-------|
| Week 1 | Phase 1 items 1.1-1.5 (Security) |
| Week 2 | Phase 1 items 1.6-1.10 (Logging, Health, Backup) |
| Week 3 | Phase 2 items 2.1-2.6 (CSP, Caching, Metrics, Retries) |
| Week 4 | Phase 2 items 2.7-2.9 (Error Boundaries, Structured Logging) |
| Month 2 | Phase 3 (PostgreSQL, Object Storage, K8s, Tracing) |

---

*Last updated: 2026-11-22*
*Generated as part of Phase 5C Production Readiness Review*