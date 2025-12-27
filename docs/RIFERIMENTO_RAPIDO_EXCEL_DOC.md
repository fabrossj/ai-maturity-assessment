# 📋 RIFERIMENTO RAPIDO - Dati Excel & Metodologia

**Fonte:** AI_Maturity_Assessment_Template__1_.xlsx + AI_Maturity_Assessment_Metodologia__1_.docx

---

## 🔢 FORMULE CALCOLO (DA EXCEL)

### Punteggio Elemento
```
Formula Excel: =(G5+H5)/2 poi /5*100
TypeScript:    ((answerA + answerB) / 2) / 5 * 100
```

**Esempio:**
- Risposta 1.1.a = 3
- Risposta 1.1.b = 4
- Media = (3 + 4) / 2 = 3.5
- Normalizzazione = 3.5 / 5 = 0.7
- Percentuale = 0.7 × 100 = **70 punti**

### Punteggio Area
```
Formula Excel: =AVERAGE(J5:J7)
TypeScript:    (elem1 + elem2 + elem3) / 3
```

### Contributo Area
```
Formula Excel: =H23*I23
TypeScript:    areaScore * areaWeight
```

### Score Totale
```
Formula Excel: =SUM(J23:J27)
TypeScript:    sum(contributions)
```

### Livello Maturità
```
Formula Excel: =IF(I30<=20,"Iniziale",IF(I30<=40,"Consapevole",...))
TypeScript:    
  if (score <= 20) return 'Iniziale';
  if (score <= 40) return 'Consapevole';
  if (score <= 60) return 'In Sviluppo';
  if (score <= 80) return 'Avanzato';
  return 'Leader';
```

---

## 📊 STRUTTURA QUESTIONARIO

### Aree (5 totali)

| # | Codice | Nome | Peso | Rationale |
|---|--------|------|------|-----------|
| 1 | 1 | Governance e Strategia | 25% | Bloccante: senza strategia, investimenti inefficaci |
| 2 | 2 | Cultura Aziendale e Change Management | 25% | Critica: resistenza culturale vanifica soluzioni tech |
| 3 | 3 | Maturità Digitale Dipendenti | 16% | Importante: correggibile con formazione |
| 4 | 4 | Infrastruttura Tecnologica e Dati | 22% | Bloccante: prerequisito tecnico per AI |
| 5 | 5 | Capacità di Innovazione e Ricerca | 12% | Importante: sostenibilità lungo termine |

**Totale:** 100%

### Elementi (15 totali, 3 per area)

**Area 1 - Governance:**
- 1.1: Strategia AI definita (peso 33.33%)
- 1.2: Team dedicato AI (peso 33.33%)
- 1.3: Allineamento strategico (peso 33.33%)

**Area 2 - Cultura:**
- 2.1: Conoscenza e accettazione AI (peso 33.33%)
- 2.2: Processi di change management (peso 33.33%)
- 2.3: Formazione continua (peso 33.33%)

**Area 3 - Maturità Digitale:**
- 3.1: Competenze digitali (peso 33.33%)
- 3.2: Apertura a nuovi strumenti (peso 33.33%)
- 3.3: Preoccupazioni su AI (peso 33.33%)

**Area 4 - Infrastruttura:**
- 4.1: Infrastruttura adeguata (peso 33.33%)
- 4.2: Accessibilità dati (peso 33.33%)
- 4.3: Governance dei dati (peso 33.33%)

**Area 5 - Innovazione:**
- 5.1: Investimento in R&D (peso 33.33%)
- 5.2: Collaborazioni esterne (peso 33.33%)
- 5.3: Progetti pilota (peso 33.33%)

### Domande (30 totali, 2 per elemento)

**Esempio Area 1, Elemento 1.1:**

| Codice | Testo Domanda | Descrizione Livelli |
|--------|---------------|---------------------|
| 1.1.a | In quale fase si trova attualmente l'organizzazione rispetto alla definizione di una roadmap per l'intelligenza artificiale? | 0=Inesistente \| 1=Mai discussa formalmente \| 2=In discussione iniziale \| 3=Abbozzata \| 4=Documentata e condivisa \| 5=Formalizzata e in implementazione |
| 1.1.b | Come vengono identificate e prioritizzate le opportunità di applicazione dell'IA? | 0=Nessun processo \| 1=Approccio casuale \| 2=Su richiesta dipartimenti \| 3=Iniziative sporadiche \| 4=Processo definito \| 5=Metodologia strutturata ricorrente |

**(Vedi Excel foglio "Questionario" per tutte le 30 domande complete)**

---

## 📈 CLASSIFICAZIONE LIVELLI

| Score Range | Livello | Significato | Caratteristiche Tipiche |
|-------------|---------|-------------|-------------------------|
| 0-20 | Iniziale | Non pronto per AI | Nessuna strategia, resistenza culturale, infra obsoleta |
| 21-40 | Consapevole | Interesse emergente | Discussioni avviate, iniziative sparse, competenze base |
| 41-60 | In Sviluppo | Implementazione parziale | Piloti in corso, competenze in crescita, disomogeneità |
| 61-80 | Avanzato | Pronto per adozione sistemica | Strategia definita, infra adeguata, ROI dimostrato |
| 81-100 | Leader | Eccellenza | Best practice consolidate, AI integrata in core business |

---

## ⚠️ LOGICHE BLOCCANTI

### Criticità per Area

| Peso Area | Score < 40 | Severità |
|-----------|------------|----------|
| ≥24% (Governance, Cultura) | ✓ | 🔴 BLOCCANTE |
| 15-24% (Infra, Digitale) | ✓ | 🟠 CRITICO |
| <15% (Innovazione) | ✓ | 🟡 RILEVANTE |

**Esempi:**
- Score Governance = 35 → 🔴 BLOCCANTE (area peso 25%)
- Score Infrastruttura = 38 → 🟠 CRITICO (area peso 22%)
- Score Innovazione = 30 → 🟡 RILEVANTE (area peso 12%)

### Combinazioni Critiche

**⚠️ ALLARME ROSSO:**
- Score < 40 in Governance E Infrastruttura
- Azione: Bloccare altre iniziative, investire qui prioritariamente

**⚠️ ALLARME ARANCIONE:**
- Score < 40 in Governance O Infrastruttura
- Azione: Piano emergenza per colmare gap

**✅ VERDE:**
- Score > 70 in Governance E Infrastruttura
- Azione: Accelerare su cultura e digitale

---

## 🎯 DATASET TEST (Golden Master)

### Test Case 1: Tutte risposte = 3

**Input:**
```json
{
  "1.1.a": 3, "1.1.b": 3,
  "1.2.a": 3, "1.2.b": 3,
  // ... tutte 30 domande = 3
}
```

**Output Atteso:**
```json
{
  "totalScore": 60.0,
  "maturityLevel": "In Sviluppo",
  "areas": [
    {
      "code": "1",
      "name": "Governance e Strategia",
      "areaPercentage": 60.0,
      "weight": 0.25,
      "contribution": 15.0
    },
    // ... tutte aree = 60%
  ]
}
```

### Test Case 2: Risposte miste (da Excel esempio)

**Input:**
```json
{
  "1.1.a": 1, "1.1.b": 2,  // Elemento 1.1 → (1+2)/2 = 1.5 → 30%
  "1.2.a": 1, "1.2.b": 4,  // Elemento 1.2 → (1+4)/2 = 2.5 → 50%
  "1.3.a": 2, "1.3.b": 1,  // Elemento 1.3 → (2+1)/2 = 1.5 → 30%
  // Area 1 → (30+50+30)/3 = 36.67%
  
  "2.1.a": 3, "2.1.b": 4,  // → 70%
  "2.2.a": 5, "2.2.b": 0,  // → 50%
  "2.3.a": 2, "2.3.b": 1,  // → 30%
  // Area 2 → (70+50+30)/3 = 50%
  
  // ... (vedi Excel per valori completi)
}
```

**Output Atteso (da calcolo Excel):**
```json
{
  "totalScore": 33.97,
  "maturityLevel": "Consapevole",
  "areas": [
    {
      "code": "1",
      "areaPercentage": 36.67,
      "contribution": 9.17  // 36.67 * 0.25
    },
    {
      "code": "2",
      "areaPercentage": 50.0,
      "contribution": 12.5  // 50.0 * 0.25
    }
    // ...
  ]
}
```

---

## 🗂️ MAPPING CELLE EXCEL

### Foglio "Questionario"

| Colonna | Contenuto |
|---------|-----------|
| A | Area (ripetuto per raggruppamento) |
| B | Codice domanda (1.1.a, 1.1.b, ...) |
| C | Testo domanda |
| D | **Risposta (0-5)** ← INPUT UTENTE |
| E | Descrizione livelli |
| F | Note (opzionale) |

**Righe dati:** 6-53 (30 domande)

### Foglio "Calcoli"

**Sezione Calcolo Elementi:**
- Colonna G: Risposta A (=Questionario!D6)
- Colonna H: Risposta B (=Questionario!D7)
- Colonna I: Media (=(G5+H5)/2)
- Colonna J: Percentuale (=I5/5*100)

**Sezione Calcolo Aree:**
- Colonna H: Media area (=AVERAGE(J5:J7))
- Colonna I: Peso area (0.25, 0.22, ...)
- Colonna J: Contributo (=H23*I23)

**Totale:**
- Cella I30: Score totale (=SUM(J23:J27))
- Cella G32: Livello maturità (=IF(...))

---

## ✅ CHECKLIST VERIFICA IMPLEMENTAZIONE

### Calcoli
- [ ] Formula elemento: `((a+b)/2)/5*100` ← esatta
- [ ] Formula area: media 3 elementi
- [ ] Contributo: `score * peso`
- [ ] Totale: somma 5 contributi
- [ ] Classificazione: boundaries corretti (<=20, <=40, ...)

### Dati
- [ ] 5 aree con pesi corretti (somma = 100%)
- [ ] 15 elementi (3 per area, peso 33.33% ciascuno)
- [ ] 30 domande (2 per elemento)
- [ ] Scala 0-5 (6 livelli)
- [ ] Descrizioni livelli presenti per ogni domanda

### Test
- [ ] Test case "all 3s" → score 60.0
- [ ] Test case Excel esempio → score 33.97
- [ ] Tutti arrotondamenti a 2 decimali
- [ ] Livello "In Sviluppo" per score 60
- [ ] Livello "Consapevole" per score 33.97

---

**NOTE FINALI:**

1. **Priorità Assoluta:** Formule calcolo devono matchare Excel al 100% (tolleranza < 0.01)
2. **Versioning:** Ogni assessment salvato con snapshot configurazione usata
3. **Immutabilità:** Versioni pubblicate mai modificate (solo clone → edit → publish)
4. **GDPR:** Data retention 24 mesi, auto-delete, export/cancellazione disponibili

---

**QUICK REFERENCE FOR CLAUDE CODE:**

Quando implementi scoring engine, usa ESATTAMENTE queste formule:
```typescript
// Elemento
const avg = (answerA + answerB) / 2;
const elemScore = (avg / 5) * 100;

// Area
const areaScore = (elem1Score + elem2Score + elem3Score) / 3;

// Contributo
const contribution = areaScore * areaWeight;

// Totale
const totalScore = contribution1 + contribution2 + contribution3 + contribution4 + contribution5;

// Livello
if (totalScore <= 20) return 'Iniziale';
if (totalScore <= 40) return 'Consapevole';
if (totalScore <= 60) return 'In Sviluppo';
if (totalScore <= 80) return 'Avanzato';
return 'Leader';
```

Nessuna ottimizzazione, nessuna semplificazione. Replica esatta di Excel.
