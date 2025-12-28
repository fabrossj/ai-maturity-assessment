# 🧪 Testing Guide - AI Maturity Assessment

Guida completa per testare tutte le funzionalità del sistema.

---

## 📋 Pre-requisiti

### 1. Database Setup
```bash
# Assicurati che il database sia configurato e seeded
pnpm prisma migrate deploy
pnpm prisma db seed
```

### 2. Environment Variables
Verifica che `.env.local` contenga:
```env
DATABASE_URL="postgresql://..."
REDIS_URL="redis://localhost:6379"  # Opzionale
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

---

## 🎯 Opzioni di Test

### **Opzione 1: Test Automatizzati (Vitest)**

#### Test Completi
```bash
# Esegui tutti i test (unit + integration)
pnpm vitest run

# Output atteso:
# ✓ tests/unit/scoring.test.ts (5 tests)
# ✓ tests/unit/questionnaire-service.test.ts (24 tests)
# ✓ tests/unit/api-assessment.test.ts (3 tests)
# ✓ tests/integration/admin-api.test.ts (15 tests)
#
# Test Files  4 passed (4)
# Tests  47 passed (47)
```

#### Solo Unit Tests
```bash
pnpm test:unit
```

#### Solo Integration Tests
```bash
pnpm vitest run tests/integration
```

#### Con Coverage
```bash
pnpm test:coverage
```

---

### **Opzione 2: Test Flow Completo (Script)**

Testa l'intero flusso: Create → Submit → Calculate → Generate PDF

```bash
pnpm tsx scripts/test-full-flow.ts
```

**Cosa fa questo script:**
1. ✅ Recupera l'ultima versione del questionario pubblicata
2. ✅ Crea un nuovo assessment con dati di test
3. ✅ Genera risposte casuali (score 2-5) per tutte le domande
4. ✅ Calcola i punteggi usando il scoring engine
5. ✅ Salva l'assessment come SUBMITTED
6. ✅ Genera il PDF report con Puppeteer
7. ✅ Salva il PDF in `public/pdfs/`
8. ✅ Aggiorna lo status a PDF_GENERATED
9. ✅ Mostra un summary completo con URLs di test

**Output Atteso:**
```
🧪 Starting Complete Flow Test

📋 Step 1: Getting latest questionnaire version...
✅ Found version 1 with 5 areas

📝 Step 2: Creating new assessment...
✅ Assessment created with ID: abc-123-def
   Email: test-1234567890@example.com

📊 Step 3: Generating sample answers...
✅ Generated 30 sample answers (scores: 2-5)

🧮 Step 4: Calculating scores...
✅ Scores calculated:
   Total Score: 65.3%
   Maturity Level: Ottimizzato
   Areas: 5

💾 Step 5: Updating assessment with results...
✅ Assessment updated to SUBMITTED status

📄 Step 6: Generating PDF report...
✅ PDF generated in 2347ms
   Size: 145.67 KB

💾 Step 7: Saving PDF to public/pdfs/...
✅ PDF saved: test-assessment-abc-123-def.pdf

🔄 Step 8: Updating database with PDF metadata...
✅ Database updated to PDF_GENERATED status

═══════════════════════════════════════════════════════
🎉 TEST COMPLETED SUCCESSFULLY!

📊 Results Summary:
   Assessment ID: abc-123-def
   User Email: test-1234567890@example.com
   Total Score: 65.3%
   Maturity Level: Ottimizzato
   Questions Answered: 30
   PDF File: test-assessment-abc-123-def.pdf
   PDF Size: 145.67 KB
   Status: PDF_GENERATED

🌐 Test URLs:
   Results: http://localhost:3000/api/assessment/abc-123-def/results
   PDF Download: http://localhost:3000/api/assessment/abc-123-def/pdf
   Results Page: http://localhost:3000/assessment/abc-123-def/results
```

---

### **Opzione 3: Test API Endpoints (HTTP)**

Testa tutte le API tramite richieste HTTP reali.

**⚠️ IMPORTANTE:** Avvia prima il server Next.js!

```bash
# Terminal 1: Start dev server
pnpm dev

# Terminal 2: Run API tests
pnpm tsx scripts/test-api-endpoints.ts
```

**Cosa testa:**
1. ✅ GET /api/questionnaire/latest
2. ✅ POST /api/assessment (create)
3. ✅ GET /api/assessment/[id]
4. ✅ POST /api/assessment/[id]/submit
5. ✅ GET /api/assessment/[id]/results
6. ✅ GET /api/assessment/[id]/pdf (PDF download)
7. ✅ GET /api/admin/questionnaire
8. ✅ GET /api/admin/queue/status

**Output Atteso:**
```
🧪 Testing API Endpoints

📡 API Base URL: http://localhost:3000

⚠️  Make sure the Next.js dev server is running (pnpm dev)

1️⃣  Testing GET /api/questionnaire/latest...
   ✅ 200 - 45ms

2️⃣  Testing POST /api/assessment...
   ✅ 201 - 123ms
   Created assessment ID: xyz-789-abc

3️⃣  Testing GET /api/assessment/[id]...
   ✅ 200 - 78ms

4️⃣  Testing POST /api/assessment/[id]/submit...
   ✅ 200 - 234ms

5️⃣  Testing GET /api/assessment/[id]/results...
   ✅ 200 - 56ms

6️⃣  Testing GET /api/assessment/[id]/pdf...
   ✅ 200 - 2145ms
   Content-Type: application/pdf
   Size: 142.34 KB

7️⃣  Testing GET /api/admin/questionnaire...
   ✅ 200 - 67ms

8️⃣  Testing GET /api/admin/queue/status...
   ✅ 200 - 34ms

═══════════════════════════════════════════════════════
📊 Test Summary

✅ Passed: 8/8
❌ Failed: 0/8
⏱️  Average response time: 348ms

═══════════════════════════════════════════════════════
```

---

### **Opzione 4: Test Manuale Browser**

#### Step 1: Avvia il server
```bash
pnpm dev
```

#### Step 2: Testa il flusso completo nel browser

1. **Homepage**
   - Vai a: http://localhost:3000
   - Verifica che la pagina si carichi correttamente

2. **Nuovo Assessment**
   - Vai a: http://localhost:3000/assessment/new
   - Compila il form:
     - Email: `test@example.com`
     - Nome: `Test User`
     - Azienda: `Test Company`
     - ✅ Accetta il consenso privacy
   - Clicca "Inizia Valutazione"

3. **Compila il Questionario**
   - Rispondi alle 30 domande (5 aree × 3 elementi × 2 domande)
   - Usa gli slider 0-5 per ogni domanda
   - Clicca "Avanti" tra le sezioni
   - Clicca "Invia Valutazione" alla fine

4. **Visualizza Risultati**
   - Verifica che appaia:
     - ✅ Punteggio totale (0-100%)
     - ✅ Livello di maturità (badge colorato)
     - ✅ Breakdown per area (grafici)
     - ✅ Tabella dettagliata elementi
     - ✅ Pulsante "Scarica Report PDF"

5. **Download PDF**
   - Clicca "Scarica Report PDF"
   - Verifica che il PDF venga scaricato
   - Apri il PDF e controlla:
     - ✅ Header professionale
     - ✅ Punteggio totale grande e visibile
     - ✅ Badge livello maturità
     - ✅ Grafici per area
     - ✅ Tabella dettagliata
     - ✅ Footer con data

---

### **Opzione 5: Test PDF Worker (Background)**

Testa il worker BullMQ per la generazione PDF in background.

#### Step 1: Avvia Redis (opzionale ma consigliato)
```bash
# Se hai Redis installato
redis-server

# Oppure con Docker
docker run -d -p 6379:6379 redis:alpine
```

#### Step 2: Avvia il dev server
```bash
# Terminal 1
pnpm dev
```

#### Step 3: Avvia il PDF worker
```bash
# Terminal 2
pnpm worker:pdf
```

**Output Atteso del Worker:**
```
✅ Redis connected
🚀 PDF worker started and listening for jobs...
```

#### Step 4: Crea e sottometti un assessment
```bash
# Terminal 3
pnpm tsx scripts/test-full-flow.ts
```

**Output Atteso dal Worker (Terminal 2):**
```
📄 Processing PDF generation for assessment: abc-123-def
📁 Created PDF directory: C:\...\public\pdfs
✅ PDF generated: assessment-abc-123-def.pdf
✅ Assessment abc-123-def status updated to PDF_GENERATED
✅ Job 1 completed: { filename: 'assessment-abc-123-def.pdf', size: 149234 }
```

---

### **Opzione 6: Test Singolo PDF**

Testa solo la generazione PDF per un assessment esistente.

```bash
pnpm tsx scripts/test-pdf.ts
```

**Prerequisito:** Devi avere almeno un assessment con status SUBMITTED nel database.

**Output Atteso:**
```
🔍 Finding a submitted assessment...
✅ Found assessment: abc-123-def
   User: test@example.com
   Submitted: 2025-12-28T10:30:00.000Z

📄 Generating PDF...
✅ PDF generated successfully!
   File: C:\...\public\pdfs\test-assessment-abc-123-def.pdf
   Size: 142.34 KB

🌐 View at: http://localhost:3000/pdfs/test-assessment-abc-123-def.pdf
```

---

## 🐛 Troubleshooting

### Problema: "Could not find Chrome"
```bash
# Soluzione: Installa Chrome per Puppeteer
npx puppeteer browsers install chrome
```

### Problema: "Redis connection failed"
```
⚠️ Questo è normale se Redis non è in esecuzione.
Il sistema funziona comunque, ma i PDF vengono generati on-demand invece che in background.
```

**Per risolvere:**
```bash
# Installa Redis (Windows)
# Scarica da: https://github.com/microsoftarchive/redis/releases

# Oppure usa Docker
docker run -d -p 6379:6379 redis:alpine

# Oppure ignora Redis (graceful degradation)
```

### Problema: "Assessment not found"
```bash
# Verifica che il database sia seeded
pnpm prisma db seed

# Verifica che ci siano assessment nel database
pnpm prisma studio
# Vai su "AssessmentResponse" e controlla
```

### Problema: "Tests failing"
```bash
# Reset del database di test
pnpm prisma migrate reset

# Re-seed
pnpm prisma db seed

# Re-run tests
pnpm vitest run
```

---

## 📊 Checklist Completa

### ✅ Pre-Test
- [ ] Database creato e migrated
- [ ] Database seeded (version 1 + admin users)
- [ ] `.env.local` configurato
- [ ] Dependencies installate (`pnpm install`)

### ✅ Test Automatizzati
- [ ] All tests passing (47/47)
- [ ] Unit tests passing (32/32)
- [ ] Integration tests passing (15/15)
- [ ] Build production succeeds

### ✅ Test Flow Completo
- [ ] `test-full-flow.ts` completa senza errori
- [ ] Assessment creato
- [ ] Scores calcolati correttamente
- [ ] PDF generato (size > 100 KB)
- [ ] File salvato in `public/pdfs/`
- [ ] Database aggiornato (status = PDF_GENERATED)

### ✅ Test API HTTP
- [ ] Dev server running
- [ ] `test-api-endpoints.ts` - 8/8 tests passed
- [ ] Response times < 3s (PDF can be slower)
- [ ] PDF download returns valid PDF

### ✅ Test Manuale Browser
- [ ] Homepage carica
- [ ] Form assessment funziona
- [ ] Questionario completo (30 domande)
- [ ] Submit funziona
- [ ] Results page mostra dati
- [ ] PDF download funziona
- [ ] PDF visualizzabile e corretto

### ✅ Test Worker (Opzionale)
- [ ] Redis running
- [ ] Worker starts without errors
- [ ] Worker processes jobs
- [ ] PDFs saved to filesystem
- [ ] Database updated correctly

---

## 🎯 Test Rapido (Quick Test)

Se hai poco tempo, esegui questi 3 comandi:

```bash
# 1. Test suite automatizzati
pnpm vitest run

# 2. Test flow completo
pnpm tsx scripts/test-full-flow.ts

# 3. Verifica build
pnpm build
```

**Se tutti e 3 passano, il sistema è funzionante al 100%!** ✅

---

## 📝 Next Steps

Dopo aver verificato che tutto funziona:

1. ✅ Review dei risultati
2. ✅ Check del PDF generato
3. ✅ Verifica performance (< 3s per PDF)
4. ✅ Ready for P7: Email Notifications

---

**Buon Testing!** 🚀
