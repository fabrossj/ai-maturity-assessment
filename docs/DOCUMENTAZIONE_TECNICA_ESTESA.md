# 📘 AI MATURITY ASSESSMENT - DOCUMENTAZIONE TECNICA ESTESA

Questo documento complementa il **PROMPT_PACK_COMPLETO.md** fornendo dettagli architetturali, specifiche di sicurezza, strategie di test e procedure di produzione.

---

## 🎯 ANALISI REQUISITI FUNZIONALI

### Attori del Sistema

1. **Utente Finale (Valutatore)**
   - Compila questionario tramite link univoco
   - Visualizza risultati preliminari
   - Riceve report PDF via email
   - Può esportare/cancellare propri dati (GDPR)

2. **Amministratore**
   - Gestisce configurazione questionario
   - Crea/modifica/pubblica versioni
   - Visualizza analytics aggregate
   - Accede a storico assessment

3. **Sistema**
   - Calcola score automaticamente
   - Genera report PDF async
   - Invia email con retry
   - Applica data retention GDPR

### Flussi Principali

#### Flusso Utente
```
1. Accesso → Email + Consenso Privacy
2. Compilazione → 30 domande scala 0-5
3. Auto-save → Draft ogni 30s
4. Submit → Validazione completezza
5. Calcolo → Score in tempo reale
6. Visualizzazione → Dashboard con grafici
7. Email → Report PDF allegato
```

#### Flusso Admin
```
1. Login → NextAuth credentials
2. Dashboard → Analytics aggregati
3. Versioni → Lista DRAFT/PUBLISHED
4. Clone → Crea nuova versione da precedente
5. Edit → CRUD aree/elementi/domande
6. Validazione → Pesi = 100%
7. Publish → Immutabile, incrementa versionNumber
```

---

## 🏗️ ARCHITETTURA SISTEMA

### Stack Tecnologico Completo

**Frontend:**
- Next.js 14 (App Router, SSR, API Routes)
- React 18 (Server Components + Client Components)
- TypeScript 5.3 (strict mode)
- Tailwind CSS 3 + Shadcn/ui
- React Hook Form + Zod (validation)
- Recharts (grafici)

**Backend:**
- Node.js 20 LTS
- Prisma 5 (ORM + migrations)
- NextAuth.js v5 (autenticazione)
- Zod (validation schema-first)

**Database:**
- PostgreSQL 16 (ACID, JSON support)
- Connection pooling (Prisma default: 10)
- Indexes ottimizzati per query frequenti

**Cache & Queue:**
- Redis 7 (cache config, session, queue storage)
- BullMQ (job queue con retry exponential)

**Workers:**
- PDF: Puppeteer (Chromium headless)
- Email: Nodemailer (SMTP/API)

**Infrastruttura:**
- Docker Compose (multi-container)
- Nginx (reverse proxy, TLS termination, rate limiting)

### Data Model Dettagliato

**Versioning Immutabile:**
```
QuestionnaireVersion (PUBLISHED) ← Immutabile
├── Area 1 (Governance)
│   ├── Element 1.1 (Strategia)
│   │   ├── Question 1.1.a
│   │   └── Question 1.1.b
│   ├── Element 1.2
│   └── Element 1.3
├── Area 2...
└── Area 5

AssessmentResponse
├── Punta a versione specifica
├── Answers JSON: { "1.1.a": 3, "1.1.b": 4, ... }
└── CalculatedScores JSON: { totalScore, maturityLevel, areas[] }
```

**Relazioni Chiave:**
- `AssessmentResponse.questionnaireVersionId → QuestionnaireVersion.id` (foreign key)
- Cascade delete: eliminare versione → elimina aree/elementi/domande
- Soft delete assessment: GDPR compliance

### API Design Pattern

**REST + JSON:**
```
GET    /api/questionnaire/latest        → Struttura questionario
POST   /api/assessment                  → Crea draft
PATCH  /api/assessment/:id              → Aggiorna draft
POST   /api/assessment/:id/submit       → Submit finale
GET    /api/assessment/:id/results      → Score calcolati
GET    /api/assessment/:id/pdf          → Download PDF

POST   /api/admin/questionnaire/versions        → Clone versione
PATCH  /api/admin/questionnaire/version/:id     → Modifica draft
POST   /api/admin/questionnaire/version/:id/publish → Pubblica
```

**Error Model Standardizzato:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dati non validi",
    "details": [
      { "field": "userEmail", "message": "Email non valida" }
    ]
  }
}
```

---

## 🧪 STRATEGIA TEST & EXCEL PARITY

### Test Pyramid

```
         /\
        /E2E\       5% - Playwright (flussi completi)
       /-----\
      /Integr.\    25% - API + DB + Workers
     /---------\
    /   Unit    \  70% - Pure functions, formulas, utils
   /-------------\
```

### Golden Master Testing

**Obiettivo:** Garantire parità 1:1 con Excel

**Approccio:**
1. Estrai 5 scenari test da Excel (risposte + score attesi)
2. Salva in `tests/fixtures/golden-dataset.json`
3. Esegui calcolo con TypeScript
4. Confronta risultati: tolleranza < 0.01

**Dataset Esempio:**
```json
{
  "testCases": [
    {
      "name": "All answers 3",
      "answers": { "1.1.a": 3, "1.1.b": 3, ... },
      "expected": {
        "totalScore": 60.0,
        "maturityLevel": "In Sviluppo",
        "areas": [
          { "code": "1", "areaPercentage": 60.0, "contribution": 15.0 }
        ]
      }
    }
  ]
}
```

**Test Implementation:**
```typescript
describe('Golden Master Tests', () => {
  goldenDataset.testCases.forEach((testCase) => {
    it(`matches Excel: ${testCase.name}`, () => {
      const result = calculateFullAssessment(testCase.answers, config);
      expect(result.totalScore).toBeCloseTo(testCase.expected.totalScore, 2);
      expect(result.maturityLevel).toBe(testCase.expected.maturityLevel);
    });
  });
});
```

### Coverage Target

- **Scoring Engine:** 100% (critical path)
- **Validation:** 100% (security)
- **API Routes:** 80%
- **UI Components:** 60%
- **Overall:** >80%

---

## 🔒 SICUREZZA & PRIVACY

### OWASP Top 10 Checklist

#### 1. Injection (SQL, NoSQL)
✅ **Prisma ORM:** Query parametrizzate automatiche
```typescript
// ✅ SAFE
await prisma.user.findMany({ where: { email: userInput } });

// ❌ UNSAFE
await prisma.$executeRawUnsafe(`SELECT * FROM users WHERE email = '${userInput}'`);
```

#### 2. Broken Authentication
✅ **NextAuth.js:** Session management robusto
✅ **bcrypt:** Password hashing (cost 12)
✅ **Rate limiting:** 5 tentativi login / 15 min
✅ **JWT:** Expiry 8h admin, 24h user

#### 3. Sensitive Data Exposure
✅ **HTTPS:** Obbligatorio (redirect HTTP → HTTPS)
✅ **Logging:** PII mascherato in log
✅ **Error messages:** Generic in produzione

#### 4. XSS (Cross-Site Scripting)
✅ **React:** Auto-escaping default
✅ **DOMPurify:** Sanitize HTML input
✅ **CSP Headers:** Content Security Policy

```javascript
// CSP Header
"default-src 'self'; script-src 'self' 'unsafe-inline';"
```

#### 5. Broken Access Control
✅ **RBAC:** Admin vs User separation
✅ **Token validation:** Ownership check su assessment
✅ **Middleware:** requireAdmin() su route sensibili

```typescript
export async function requireOwnership(req: Request, assessmentId: string) {
  const assessment = await prisma.assessmentResponse.findUnique({
    where: { id: assessmentId }
  });
  
  const token = req.headers.get('X-Assessment-Token');
  if (assessment.userToken !== token) {
    throw new ForbiddenError('Access denied');
  }
}
```

#### 6-10. Security Misconfiguration, XXE, Insecure Deserialization, etc.
✅ **Security headers:** Helmet-like config in next.config.js
✅ **Dependency audit:** `pnpm audit` in CI
✅ **Input validation:** Zod schemas su tutti endpoint
✅ **Environment variables:** Validation con Zod
✅ **Health check:** `/api/health` espone solo status

### GDPR Compliance

**Principi Implementati:**

1. **Lawfulness, Fairness, Transparency**
   - Privacy policy link visibile
   - Consenso esplicito richiesto (checkbox)
   - Linguaggio chiaro

2. **Purpose Limitation**
   - Dati usati solo per assessment + analytics anonimi
   - No marketing senza consenso separato

3. **Data Minimization**
   - PII richiesti: solo email (necessario per report)
   - Opzionale: nome utente
   - No dati sensibili raccolti

4. **Storage Limitation**
   - Retention: 24 mesi (campo `dataRetentionUntil`)
   - Cron job giornaliero: auto-delete scaduti
   - Analytics: dati anonimi (no retention limit)

5. **Integrity & Confidentiality**
   - HTTPS obbligatorio
   - Backup cifrati (filesystem encryption)
   - Access control: RBAC

**Diritti Utente:**

```typescript
// Export dati (Art. 20 - Portabilità)
GET /api/assessment/:id/export → JSON download

// Cancellazione (Art. 17 - Oblio)
DELETE /api/assessment/:id → Hard delete + audit log

// Rettifica
PATCH /api/assessment/:id → Modifica email/nome
```

**Cron Auto-Delete:**
```typescript
// scripts/cron-delete-expired.ts
export async function deleteExpiredAssessments() {
  const threshold = subMonths(new Date(), 24);
  
  const deleted = await prisma.assessmentResponse.deleteMany({
    where: { dataRetentionUntil: { lte: threshold } }
  });
  
  logger.info(`Auto-deleted ${deleted.count} expired assessments`);
}
```

---

## 🚀 RUNBOOK PRODUZIONE

### Pre-Deployment Checklist

```bash
# Server Requirements
- [ ] Ubuntu 22.04 LTS
- [ ] 4 CPU cores, 8GB RAM, 50GB SSD
- [ ] Docker 24+ installed
- [ ] Domain DNS → Server IP
- [ ] Firewall: 80, 443, 22 open

# SSL Certificates
- [ ] Let's Encrypt configured
- [ ] Certbot auto-renewal enabled

# Secrets
- [ ] .env.production created
- [ ] DATABASE_URL configured
- [ ] NEXTAUTH_SECRET: 64-char random
- [ ] SMTP credentials tested
```

### Initial Deployment

```bash
cd /var/www/ai-assessment

# 1. Clone repository
git clone https://github.com/yourorg/ai-assessment.git .

# 2. Configure environment
cp .env.template .env.production
nano .env.production  # Fill secrets

# 3. Build & start
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# 4. Run migrations
docker-compose -f docker-compose.prod.yml run --rm app pnpm prisma migrate deploy

# 5. Seed data
docker-compose -f docker-compose.prod.yml run --rm app pnpm prisma db seed
docker-compose -f docker-compose.prod.yml run --rm app pnpm tsx prisma/seed-admin.ts

# 6. Health check
curl -f https://yourdomain.com/api/health
```

### Standard Deployment Procedure

```bash
# 1. Pull latest
git pull origin main

# 2. Build
docker-compose -f docker-compose.prod.yml build

# 3. Migrations (if any)
docker-compose -f docker-compose.prod.yml run --rm app pnpm prisma migrate deploy

# 4. Restart
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d

# 5. Verify
sleep 10
curl -f https://yourdomain.com/api/health

# 6. Check workers
docker-compose logs pdf-worker | grep "started"
docker-compose logs email-worker | grep "started"
```

### Rollback Procedure

```bash
# 1. Identify last working commit
git log --oneline -10

# 2. Revert
git revert <commit-hash>

# 3. Re-deploy
./scripts/deploy.sh

# 4. Rollback migrations (if needed - CAREFUL!)
docker-compose run --rm app pnpm prisma migrate resolve --rolled-back <migration-name>
```

### Monitoring & Maintenance

**Daily Checks:**
```bash
# Health
curl https://yourdomain.com/api/health

# Errors in logs
docker-compose logs --tail=100 app | grep -i error

# Queue sizes (should be < 100)
docker-compose exec redis redis-cli llen bull:pdf-generation:wait

# Database size
docker-compose exec postgres psql -U postgres ai_assessment -c \
  "SELECT pg_size_pretty(pg_database_size('ai_assessment'));"
```

**Weekly:**
```bash
# Backup database
docker-compose exec postgres pg_dump -U postgres ai_assessment > \
  backups/backup_$(date +%Y%m%d).sql

# Clean old PDFs (>90 days)
find public/pdfs -mtime +90 -delete

# Security updates
pnpm update
docker-compose build
docker-compose up -d
```

**Monthly:**
```bash
# Vacuum database
docker-compose exec postgres psql -U postgres ai_assessment -c "VACUUM ANALYZE;"

# Rotate logs
docker-compose logs > logs/docker_$(date +%Y%m).log

# Review Grafana dashboards for anomalies
```

### Troubleshooting Common Issues

**Issue: Application not starting**
```bash
# Check logs
docker-compose logs app

# Common causes:
# - Missing env vars
docker-compose exec app env | grep DATABASE

# - DB connection failed
docker-compose exec postgres pg_isready

# - Port conflict
lsof -i :3000
```

**Issue: PDF generation failing**
```bash
# Check worker logs
docker-compose logs pdf-worker

# Verify Chromium
docker-compose exec pdf-worker chromium-browser --version

# Disk space
df -h public/pdfs/

# Restart worker
docker-compose restart pdf-worker
```

**Issue: Emails not sent**
```bash
# Check worker
docker-compose logs email-worker

# Test SMTP
docker-compose exec email-worker node -e "
const nodemailer = require('nodemailer');
nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
}).verify().then(console.log).catch(console.error);
"

# Check dead letter queue
docker-compose exec redis redis-cli llen bull:email-sending:failed
```

### Backup & Restore

**Automated Backup Script:**
```bash
#!/bin/bash
# scripts/backup.sh

BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Database
docker-compose exec -T postgres pg_dump -U postgres ai_assessment | \
  gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Redis
docker-compose exec redis redis-cli SAVE
cp /var/lib/docker/volumes/ai-assessment_redis_data/_data/dump.rdb \
  $BACKUP_DIR/redis_$DATE.rdb

# PDFs
tar -czf $BACKUP_DIR/pdfs_$DATE.tar.gz public/pdfs/

# Cleanup (keep 30 days)
find $BACKUP_DIR -mtime +30 -delete

echo "Backup completed: $DATE"
```

**Restore:**
```bash
# Database
gunzip < backups/db_20251226.sql.gz | \
  docker-compose exec -T postgres psql -U postgres ai_assessment

# Redis
docker-compose down redis
cp backups/redis_20251226.rdb \
  /var/lib/docker/volumes/ai-assessment_redis_data/_data/dump.rdb
docker-compose up -d redis

# PDFs
tar -xzf backups/pdfs_20251226.tar.gz -C ./
```

### Disaster Recovery

**Scenario 1: Complete Server Failure**
1. Provision new server
2. Install Docker + Docker Compose
3. Clone repository
4. Restore latest backup (DB + Redis + PDFs)
5. Update DNS
6. Deploy
7. Verify

**RTO:** 2 hours  
**RPO:** 24 hours (daily backup)

**Scenario 2: Security Breach**
1. **Immediate:**
   - Take offline
   - Rotate all secrets
   - Review access logs

2. **Investigation:**
   - Analyze audit_logs
   - Check for malicious modifications
   - Review system logs

3. **Recovery:**
   - Patch vulnerability
   - Restore clean backup
   - Re-deploy with new secrets
   - Notify users (GDPR: 72h)

---

## 📊 PERFORMANCE OPTIMIZATION

### Database Tuning

**Indexes:**
```sql
-- Assessment queries
CREATE INDEX idx_assessment_email ON assessment_responses(user_email);
CREATE INDEX idx_assessment_status ON assessment_responses(status, submitted_at DESC);

-- Config queries
CREATE INDEX idx_areas_version ON areas(questionnaire_version_id, "order");
CREATE INDEX idx_questions_element ON questions(element_id, "order");
```

**PostgreSQL Config:**
```ini
# postgresql.conf
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
random_page_cost = 1.1  # For SSD
```

### Redis Optimization

```bash
# Memory policy
redis-cli CONFIG SET maxmemory 2gb
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Persistence
redis-cli CONFIG SET save "900 1 300 10 60 10000"
```

### Application Optimization

**Caching Strategy:**
```typescript
// Cache questionario config (TTL 1h)
export async function getCachedQuestionnaireVersion(versionId: string) {
  const key = `questionnaire:version:${versionId}`;
  const cached = await redis.get(key);
  
  if (cached) return JSON.parse(cached);
  
  const data = await prisma.questionnaireVersion.findUnique({
    where: { id: versionId },
    include: { areas: { include: { elements: { include: { questions: true } } } } }
  });
  
  await redis.setex(key, 3600, JSON.stringify(data));
  return data;
}
```

**Connection Pooling:**
```typescript
// Prisma connection pool
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  pool_timeout = 10
}

// In .env
DATABASE_POOL_SIZE=20  # Default: 10
```

---

## 🔄 SCALING STRATEGY

### Current Capacity
- 1000 assessments/month
- 50 concurrent users
- Single-node deployment

### Horizontal Scaling (Future)

**1. Database Read Replica**
```bash
# Master-slave replication
# Route reads to replica
DATABASE_URL_READ=postgresql://replica/ai_assessment
```

**2. Multiple App Containers**
```yaml
# docker-compose.prod.yml
services:
  app:
    deploy:
      replicas: 3
```

**3. Load Balancer (Nginx)**
```nginx
upstream app {
  server app1:3000;
  server app2:3000;
  server app3:3000;
}
```

**4. Redis Cluster**
```bash
# High availability
# Setup Redis Sentinel or Cluster mode
```

---

## 📞 SUPPORT & CONTACTS

- **Technical Lead:** tech-lead@example.com
- **DevOps:** devops@example.com
- **Security:** security@example.com
- **On-Call:** +39 XXX XXX XXXX

---

**END OF EXTENDED DOCUMENTATION**

Questo documento fornisce tutte le informazioni tecniche necessarie per implementare, testare, deployare e mantenere l'applicazione AI Maturity Assessment in produzione.

Per l'implementazione step-by-step, seguire il **PROMPT_PACK_COMPLETO.md**.
