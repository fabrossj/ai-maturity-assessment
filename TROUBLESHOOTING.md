# 🔧 Troubleshooting Guide

Guida rapida per risolvere i problemi comuni.

---

## ❌ Problema: "Questionario senza domande" nel browser

### Sintomi
- La pagina `/assessment/new` si carica
- Vedi l'intestazione e i campi email/consenso
- MA non vedi le 30 domande

### Diagnosi Step-by-Step

#### 1. Verifica che il dev server sia running
```bash
# Controlla se il server è attivo
# Dovresti vedere output su http://localhost:3000
pnpm dev
```

#### 2. Verifica il database
```bash
# Controlla che ci siano i dati
pnpm tsx scripts/debug-frontend.ts
```

**Output Atteso:**
```
✅ Questions loaded: 30
🎉 All checks passed!
```

Se vedi "❌ No PUBLISHED version found!", esegui:
```bash
pnpm prisma db seed
```

#### 3. Verifica l'API direttamente
Apri il browser e vai a:
```
http://localhost:3000/api/questionnaire/latest
```

**Output Atteso:** JSON con `areas` array contenente 5 aree con elementi e domande.

**Se vedi errore 404**: Il server non è avviato, esegui `pnpm dev`

**Se vedi `{"areas": []}`**: Il database è vuoto, esegui `pnpm prisma db seed`

#### 4. Controlla la Console del Browser

1. Apri DevTools (F12)
2. Vai al tab "Console"
3. Ricarica la pagina `/assessment/new`
4. Cerca questi messaggi:

**✅ Output Corretto:**
```
📥 Fetching questionnaire...
📡 Response status: 200
📦 Data received: { areas: 5, hasAreas: true }
✅ Questions loaded: 30
```

**❌ Possibili Errori:**

**Errore A: `HTTP error! status: 404`**
- Causa: Server non avviato o API non trovata
- Soluzione: `pnpm dev` in un terminale separato

**Errore B: `Invalid data structure: missing areas`**
- Causa: Database vuoto o seed non eseguito
- Soluzione: `pnpm prisma db seed`

**Errore C: `Questions loaded: 0`**
- Causa: Struttura dati corrotta
- Soluzione:
  ```bash
  pnpm prisma migrate reset  # ATTENZIONE: cancella tutti i dati!
  pnpm prisma db seed
  ```

#### 5. Verifica Network Tab

1. Apri DevTools (F12)
2. Vai al tab "Network"
3. Ricarica la pagina
4. Cerca la richiesta a `/api/questionnaire/latest`

**✅ Corretto:**
- Status: 200
- Size: ~50KB
- Preview: Vedi JSON con `areas` array

**❌ Errore:**
- Status: 404 → Server non avviato
- Status: 500 → Errore server (controlla terminal dove gira `pnpm dev`)
- Failed → CORS/Network issue

---

## ❌ Problema: "Could not find Chrome" (Puppeteer)

### Sintomi
```
Error: Could not find Chrome (ver. 143.0.7499.169)
```

### Soluzione
```bash
npx puppeteer browsers install chrome
```

Oppure:
```bash
# Windows con chocolatey
choco install chromium

# macOS
brew install chromium

# Linux
sudo apt-get install chromium-browser
```

---

## ❌ Problema: "Redis connection failed"

### Sintomi
```
⚠️ Redis connection failed
Error: connect ECONNREFUSED 127.0.0.1:6379
```

### Nota
Questo è **NORMALE** se non hai Redis installato. Il sistema funziona comunque con graceful degradation.

### Per installare Redis (opzionale)

**Windows:**
```bash
# Via WSL
wsl
sudo apt-get install redis-server
redis-server

# Via Docker (raccomandato)
docker run -d -p 6379:6379 redis:alpine
```

**macOS:**
```bash
brew install redis
brew services start redis
```

**Linux:**
```bash
sudo apt-get install redis-server
sudo systemctl start redis
```

---

## ❌ Problema: Test falliscono

### Sintomi
```
❌ Failed: X/47
```

### Soluzione 1: Reset completo
```bash
# ATTENZIONE: Cancella tutti i dati!
pnpm prisma migrate reset
pnpm prisma db seed
pnpm vitest run
```

### Soluzione 2: Solo cleanup
```bash
# Meno drastico
pnpm prisma db seed
pnpm vitest run
```

---

## ❌ Problema: Build fallisce

### Sintomi
```
Type error: ...
```

### Soluzione
```bash
# Verifica che scripts/ e workers/ siano esclusi
cat tsconfig.json | grep exclude

# Dovrebbe mostrare:
# "exclude": ["node_modules", "scripts", "workers"]

# Se non c'è, il fix è già stato applicato, prova:
pnpm build
```

---

## ❌ Problema: "Assessment not submitted yet" dopo submit

### Sintomi
- Compili il questionario
- Clicchi "Invia Assessment"
- Redirect alla pagina results
- Vedi errore "Assessment not submitted yet"

### Diagnosi
```bash
# Controlla i log del server nel terminal dove gira pnpm dev
# Cerca errori durante il submit
```

### Possibili Cause

**A. Calcolo fallito**
- Controlla che tutte le domande abbiano risposta
- Minimo richiesto: 30 domande con valori 0-5

**B. Database non aggiornato**
- Status rimasto su DRAFT invece di SUBMITTED

### Soluzione
```bash
# Test diretto submit API
pnpm tsx scripts/test-full-flow.ts

# Se funziona, il problema è nel frontend
# Controlla Browser Console per errori JavaScript
```

---

##❌ Problema: PDF download 404

### Sintomi
- Clicchi "Scarica PDF"
- Errore 404 Not Found

### Soluzione
L'endpoint PDF genera on-demand. Possibili cause:

**A. Assessment non submitted**
- Verifica status: deve essere SUBMITTED, PDF_GENERATED, o EMAIL_SENT

**B. Puppeteer/Chrome mancante**
```bash
npx puppeteer browsers install chrome
```

**C. Permissions filesystem**
```bash
# Verifica che public/pdfs/ esista e sia scrivibile
mkdir -p public/pdfs
chmod 755 public/pdfs  # Linux/macOS
```

---

## 🔍 Script di Debug Disponibili

```bash
# Debug completo database e frontend
pnpm tsx scripts/debug-frontend.ts

# Test flow end-to-end
pnpm test:flow

# Test solo PDF generation
pnpm test:pdf

# Test APIs HTTP (richiede dev server running)
pnpm test:api
```

---

## 📊 Checklist Rapida

Prima di segnalare un bug, verifica:

- [ ] `pnpm dev` è in esecuzione
- [ ] Database è seeded (`pnpm prisma db seed`)
- [ ] Browser Console non mostra errori
- [ ] Network tab mostra status 200 per `/api/questionnaire/latest`
- [ ] `pnpm tsx scripts/debug-frontend.ts` mostra "All checks passed!"
- [ ] Chrome/Chromium installato per PDF

---

## 🆘 Ancora Problemi?

1. **Reset completo** (ultima risorsa):
```bash
# ATTENZIONE: Cancella TUTTI i dati!
pnpm prisma migrate reset --force
pnpm prisma db seed
pnpm build
pnpm dev
```

2. **Controlla versioni**:
```bash
node --version  # Deve essere >= 18
pnpm --version  # Deve essere >= 8
```

3. **Controlla .env.local**:
```bash
cat .env.local

# Deve contenere almeno:
# DATABASE_URL="postgresql://..."
```

4. **Logs dettagliati**:
```bash
# Avvia con log dettagliati
DEBUG=* pnpm dev
```

---

## 📝 Reporting Issues

Se il problema persiste, raccogli queste informazioni:

1. Output di `pnpm tsx scripts/debug-frontend.ts`
2. Screenshot Browser Console (F12 → Console)
3. Screenshot Network Tab (F12 → Network)
4. Output terminal dove gira `pnpm dev`
5. Versioni: `node --version` e `pnpm --version`

---

**Good luck debugging!** 🐛🔍
