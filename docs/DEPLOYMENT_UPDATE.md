# Deployment Update Guide

Guida per aggiornare il deployment Docker dopo le modifiche al codice.

## Modifiche Recenti (2025-12-29)

### Fix Email Worker
- **Problema**: Le email non venivano inviate dopo la generazione del PDF
- **Soluzione**: Aggiunto trigger automatico dell'email job dopo la generazione del PDF
- **File modificati**:
  - `workers/pdf-worker.ts` - Aggiunto `enqueueEmailSending` dopo generazione PDF
  - `scripts/retry-pending-emails.ts` - Nuovo script per recuperare email non inviate
  - `package.json` - Aggiunto comando `email:retry`

## Come Aggiornare il Deployment

### Opzione 1: Rebuild Completo (Raccomandato)

```bash
# Stop tutti i servizi
docker-compose down

# Rebuild delle immagini con le ultime modifiche
docker-compose build --no-cache

# Riavvia tutti i servizi
docker-compose up -d

# Verifica che tutto funzioni
docker-compose ps
docker-compose logs -f pdf-worker email-worker
```

### Opzione 2: Rebuild Solo Workers (Più Veloce)

```bash
# Stop solo i worker
docker-compose stop pdf-worker email-worker

# Rebuild solo i worker
docker-compose build --no-cache pdf-worker email-worker

# Riavvia i worker
docker-compose up -d pdf-worker email-worker

# Verifica i log
docker-compose logs -f pdf-worker email-worker
```

### Opzione 3: Development Locale (No Docker)

Se stai lavorando in locale senza Docker:

```bash
# Terminal 1: Next.js App
pnpm dev

# Terminal 2: PDF Worker (riavvia se era già attivo)
# Ctrl+C per fermare, poi:
pnpm worker:pdf

# Terminal 3: Email Worker (riavvia se era già attivo)
# Ctrl+C per fermare, poi:
pnpm worker:email
```

## Verifica Post-Deploy

### 1. Verifica Container Status
```bash
docker-compose ps
```

Tutti i servizi dovrebbero essere "Up":
- postgres
- redis
- app
- pdf-worker
- email-worker

### 2. Controlla i Log dei Worker

**PDF Worker:**
```bash
docker-compose logs pdf-worker --tail 50
```

Cerca:
- ✅ `PDF worker started and listening for jobs...`
- ✅ `Redis connected`

**Email Worker:**
```bash
docker-compose logs email-worker --tail 50
```

Cerca:
- ✅ `Email worker started and listening for jobs...`
- ✅ `Redis connected`

### 3. Test Completo del Flusso

```bash
# 1. Apri l'applicazione
open http://localhost:3000

# 2. Compila un questionario completo
# 3. Sottometti l'assessment
# 4. Monitora i log in tempo reale

# Terminal separato:
docker-compose logs -f pdf-worker email-worker
```

Dovresti vedere:
1. PDF worker: `📄 Processing PDF generation...` → `✅ PDF generated`
2. PDF worker: `📧 Enqueuing email sending...` → `✅ Email job enqueued`
3. Email worker: `📧 Processing email sending...` → `✅ Email sent`

### 4. Recupera Email Pendenti (Se Necessario)

Se hai assessment con PDF generato ma email non inviata:

```bash
# Da locale (fuori da Docker)
pnpm email:retry
```

## Rollback (Se Qualcosa Non Funziona)

```bash
# Stop tutto
docker-compose down

# Checkout del commit precedente
git log --oneline -5
git checkout <commit-hash-precedente>

# Rebuild e restart
docker-compose build --no-cache
docker-compose up -d
```

## Verifica Configurazione Email

### Gmail App Password

Se usi Gmail, assicurati di avere:

1. **2FA attivato** sul tuo account Google
2. **App Password generato**:
   - Vai su: https://myaccount.google.com/apppasswords
   - Seleziona "Mail" e "Windows Computer"
   - Copia la password di 16 caratteri

3. **Configurazione .env**:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tuo-email@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx  # App Password, NON la password normale
SMTP_FROM=tuo-email@gmail.com
```

### Test Manuale Email

```bash
# Dentro il container email-worker
docker-compose exec email-worker sh

# Test connessione SMTP
telnet smtp.gmail.com 587
```

## Troubleshooting

### Email Worker Crash Loop

**Sintomo**: Container email-worker continua a riavviarsi

**Soluzione**:
```bash
# Verifica l'errore esatto
docker-compose logs email-worker --tail 100

# Problemi comuni:
# 1. Module not found → Rebuild: docker-compose build --no-cache email-worker
# 2. SMTP auth failed → Verifica SMTP_USER e SMTP_PASSWORD in .env
# 3. Redis connection → Verifica redis sia up: docker-compose ps redis
```

### PDF Generato ma Email Non Parte

**Soluzione**:
```bash
# 1. Verifica che email worker sia attivo
docker-compose ps email-worker

# 2. Controlla i job nella coda
docker-compose exec redis redis-cli
> LLEN bull:email-sending:wait
> LLEN bull:email-sending:failed

# 3. Riprova manualmente
pnpm email:retry
```

### Port Already in Use

```bash
# Trova processo che usa la porta 3000/5432/6379
netstat -ano | findstr :3000

# Killa il processo (Windows)
taskkill /PID <pid> /F

# Oppure cambia porta in docker-compose.yml
```

## Monitoring Produzione

### Health Check
```bash
curl http://localhost:3000/api/health
```

Risposta attesa:
```json
{
  "status": "healthy",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

### Queue Status
```bash
curl http://localhost:3000/api/admin/queue/status
```

### Prometheus/Grafana (Opzionale)

Se hai monitoring attivo:
- Check BullMQ metrics
- Monitor email delivery rate
- Alert su failed jobs

## Note Importanti

⚠️ **Prima di deployare in produzione**:
- [ ] Backup del database
- [ ] Test completo in staging
- [ ] Verifica SMTP credentials
- [ ] Check disk space per PDF
- [ ] Verifica limiti email provider (es. Gmail: 500 email/giorno)

✅ **Dopo il deploy**:
- [ ] Test assessment completo
- [ ] Verifica arrivo email
- [ ] Check logs per errori
- [ ] Monitora queue metrics

## Contatti

Per problemi o domande sul deployment, contatta il team di sviluppo.
