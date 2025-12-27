# 🎯 AI MATURITY ASSESSMENT - PROMPT PACK ESECUTIVO

**Target:** Claude Code CLI  
**Lingua:** Italiano  
**Stack:** TypeScript + Next.js 14 + Postgres 16 + Prisma + Redis + BullMQ + Puppeteer

---

## 📋 INDICE RAPIDO

| Prompt | Titolo | Durata Stimata |
|--------|--------|----------------|
| [P0](#p0-setup-progetto) | Setup Progetto | 10 min |
| [P1](#p1-schema-database) | Schema DB + Migrations | 15 min |
| [P2](#p2-scoring-engine) | Motore Calcolo + Test | 20 min |
| [P3](#p3-api-pubbliche) | API Utente | 25 min |
| [P4](#p4-api-admin) | API Admin + Versioning | 30 min |
| [P5](#p5-ui-frontend) | UI Questionario | 35 min |
| [P6](#p6-pdf-generation) | Worker PDF | 25 min |
| [P7](#p7-email-worker) | Worker Email | 20 min |
| [P8](#p8-admin-ui) | Dashboard Admin | 30 min |
| [P9](#p9-sicurezza) | Hardening Sicurezza | 25 min |
| [P10](#p10-test-e2e) | Test End-to-End | 30 min |
| [P11](#p11-docker-cicd) | Docker + CI/CD | 20 min |
| [P12](#p12-monitoring) | Monitoring + Docs | 20 min |

**Totale:** ~4.5 ore di sviluppo assistito

---

## 🔑 INFORMAZIONI CHIAVE DA EXCEL/DOC

### Struttura Questionario
- **5 Aree** (Governance, Cultura, Maturità Digitale, Infrastruttura, Innovazione)
- **15 Elementi** (3 per area)
- **30 Domande** (2 per elemento)
- **Scala:** 0-5 (6 livelli)

### Formule Calcolo
```typescript
// Punteggio Elemento
punteggio_elemento = ((risposta_a + risposta_b) / 2) / 5 * 100

// Punteggio Area
punteggio_area = MEDIA(3_elementi)

// Contributo Area
contributo = punteggio_area * peso_area

// Score Totale
score_totale = SOMMA(contributi_5_aree)
```

### Pesi Aree
- Governance: 25%
- Cultura: 25%
- Maturità Digitale: 16%
- Infrastruttura: 22%
- Innovazione: 12%
- **Totale:** 100%

### Classificazione Livelli
| Score | Livello |
|-------|---------|
| 0-20 | Iniziale |
| 21-40 | Consapevole |
| 41-60 | In Sviluppo |
| 61-80 | Avanzato |
| 81-100 | Leader |

---

## 📦 P0: Setup Progetto

**Obiettivo:** Inizializzare Next.js 14 + infrastruttura Docker

**Comandi:**
```bash
# Init Next.js
pnpm create next-app ai-assessment --typescript --tailwind --app --use-pnpm
cd ai-assessment

# Deps core
pnpm add @prisma/client next-auth@beta zod recharts bcrypt nodemailer bullmq ioredis date-fns
pnpm add -D prisma @types/node @types/bcrypt @types/nodemailer typescript eslint prettier husky

# Setup Prisma
pnpm prisma init

# Docker Compose
cat > docker-compose.yml << 'EOF'
version: '3.9'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: ai_assessment
    ports: ["5432:5432"]
    volumes: [postgres_data:/var/lib/postgresql/data]
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    volumes: [redis_data:/data]
volumes:
  postgres_data:
  redis_data:
EOF

# Env template
cp .env.template .env.local

# Start infra
docker-compose up -d
```

**Verifica:**
- [ ] `docker-compose ps` mostra postgres + redis healthy
- [ ] `pnpm tsc --noEmit` passa

---

## 💾 P1: Schema Database

**Obiettivo:** Definire schema Prisma completo con versioning questionario

**Schema Prisma (prisma/schema.prisma):**
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model QuestionnaireVersion {
  id            String   @id @default(cuid())
  versionNumber Int      @unique
  status        VersionStatus @default(DRAFT)
  publishedAt   DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  areas         Area[]
  assessments   AssessmentResponse[]
  
  @@map("questionnaire_versions")
}

enum VersionStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

model Area {
  id                    String   @id @default(cuid())
  questionnaireVersionId String
  questionnaireVersion  QuestionnaireVersion @relation(fields: [questionnaireVersionId], references: [id], onDelete: Cascade)
  
  code        String
  name        String
  description String?
  weight      Float
  order       Int
  
  elements    Element[]
  
  @@unique([questionnaireVersionId, code])
  @@map("areas")
}

model Element {
  id      String @id @default(cuid())
  areaId  String
  area    Area @relation(fields: [areaId], references: [id], onDelete: Cascade)
  
  code        String
  name        String
  description String?
  weight      Float @default(0.3333)
  order       Int
  
  questions   Question[]
  
  @@unique([areaId, code])
  @@map("elements")
}

model Question {
  id        String @id @default(cuid())
  elementId String
  element   Element @relation(fields: [elementId], references: [id], onDelete: Cascade)
  
  code              String
  questionText      String
  levelsDescription String
  order             Int
  scaleMin          Int @default(0)
  scaleMax          Int @default(5)
  
  @@unique([elementId, code])
  @@map("questions")
}

model AssessmentResponse {
  id                    String   @id @default(cuid())
  questionnaireVersionId String
  questionnaireVersion  QuestionnaireVersion @relation(fields: [questionnaireVersionId], references: [id])
  
  userEmail     String
  userName      String?
  userToken     String @unique
  
  status        AssessmentStatus @default(DRAFT)
  startedAt     DateTime @default(now())
  submittedAt   DateTime?
  
  answers           Json // { "1.1.a": 3, "1.1.b": 4, ... }
  notes             Json?
  calculatedScores  Json?
  
  pdfUrl            String?
  pdfGeneratedAt    DateTime?
  emailSentAt       DateTime?
  
  consentGiven          Boolean @default(false)
  dataRetentionUntil    DateTime
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([userEmail])
  @@index([status, submittedAt])
  @@map("assessment_responses")
}

enum AssessmentStatus {
  DRAFT
  SUBMITTED
  PDF_GENERATED
  EMAIL_SENT
  FAILED
}

model User {
  id           String @id @default(cuid())
  email        String @unique
  passwordHash String
  role         UserRole @default(ADMIN)
  name         String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  @@map("users")
}

enum UserRole {
  ADMIN
  SUPER_ADMIN
}
```

**Comandi:**
```bash
pnpm prisma migrate dev --name initial_schema
pnpm prisma generate

# Seed questionario v1 (vedi file Excel per dati completi)
pnpm tsx prisma/seed.ts
```

**Verifica:**
- [ ] Migration creata
- [ ] DB popolato: `pnpm prisma studio`

---

## 🧮 P2: Scoring Engine

**Obiettivo:** Implementare formule calcolo con test golden master

**File: lib/scoring/formulas.ts**
```typescript
export interface ElementScore {
  code: string;
  answerA: number;
  answerB: number;
  average: number;
  percentage: number;
}

export interface AreaScore {
  code: string;
  name: string;
  elements: ElementScore[];
  areaPercentage: number;
  weight: number;
  contribution: number;
}

export interface TotalScore {
  areas: AreaScore[];
  totalScore: number;
  maturityLevel: string;
}

export function calculateElementScore(answerA: number, answerB: number): number {
  const average = (answerA + answerB) / 2;
  return (average / 5) * 100;
}

export function calculateAreaScore(elementScores: number[]): number {
  return elementScores.reduce((sum, score) => sum + score, 0) / elementScores.length;
}

export function calculateTotalScore(contributions: number[]): number {
  return contributions.reduce((sum, contrib) => sum + contrib, 0);
}

export function classifyMaturityLevel(totalScore: number): string {
  if (totalScore <= 20) return 'Iniziale';
  if (totalScore <= 40) return 'Consapevole';
  if (totalScore <= 60) return 'In Sviluppo';
  if (totalScore <= 80) return 'Avanzato';
  return 'Leader';
}

export function calculateFullAssessment(
  answers: Record<string, number>,
  config: any
): TotalScore {
  const areas: AreaScore[] = [];
  
  for (const area of config.areas) {
    const elementScores: ElementScore[] = [];
    
    for (const element of area.elements) {
      const [q1, q2] = element.questions;
      const answerA = answers[q1.code];
      const answerB = answers[q2.code];
      
      const percentage = calculateElementScore(answerA, answerB);
      
      elementScores.push({
        code: element.code,
        answerA,
        answerB,
        average: (answerA + answerB) / 2,
        percentage
      });
    }
    
    const areaPercentage = calculateAreaScore(elementScores.map(e => e.percentage));
    const contribution = areaPercentage * area.weight;
    
    areas.push({
      code: area.code,
      name: area.name,
      elements: elementScores,
      areaPercentage,
      weight: area.weight,
      contribution
    });
  }
  
  const totalScore = calculateTotalScore(areas.map(a => a.contribution));
  const maturityLevel = classifyMaturityLevel(totalScore);
  
  return { areas, totalScore, maturityLevel };
}
```

**Test: tests/unit/scoring.test.ts**
```typescript
import { describe, it, expect } from 'vitest';
import { calculateElementScore, classifyMaturityLevel } from '@/lib/scoring/formulas';

describe('Scoring Engine', () => {
  it('calcola score elemento correttamente', () => {
    expect(calculateElementScore(3, 4)).toBeCloseTo(70, 2);
    expect(calculateElementScore(0, 0)).toBe(0);
    expect(calculateElementScore(5, 5)).toBe(100);
  });
  
  it('classifica livello maturità', () => {
    expect(classifyMaturityLevel(15)).toBe('Iniziale');
    expect(classifyMaturityLevel(35)).toBe('Consapevole');
    expect(classifyMaturityLevel(55)).toBe('In Sviluppo');
    expect(classifyMaturityLevel(75)).toBe('Avanzato');
    expect(classifyMaturityLevel(95)).toBe('Leader');
  });
});
```

**Comandi:**
```bash
pnpm add -D vitest @vitest/ui
pnpm vitest run tests/unit/scoring.test.ts
```

**Verifica:**
- [ ] Tutti test passano
- [ ] Coverage > 90% su formulas.ts

---

## 🔌 P3: API Pubbliche

**Obiettivo:** Endpoint per utente: crea assessment, salva draft, submit

**File: app/api/assessment/route.ts**
```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { randomBytes } from 'crypto';
import { z } from 'zod';

const createSchema = z.object({
  userEmail: z.string().email(),
  userName: z.string().optional(),
  consentGiven: z.literal(true)
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userEmail, userName, consentGiven } = createSchema.parse(body);
    
    const latestVersion = await prisma.questionnaireVersion.findFirst({
      where: { status: 'PUBLISHED' },
      orderBy: { versionNumber: 'desc' }
    });
    
    if (!latestVersion) {
      return NextResponse.json({ error: 'No published version' }, { status: 404 });
    }
    
    const token = randomBytes(32).toString('hex');
    
    const assessment = await prisma.assessmentResponse.create({
      data: {
        questionnaireVersionId: latestVersion.id,
        userEmail,
        userName,
        userToken: token,
        consentGiven,
        answers: {},
        dataRetentionUntil: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000) // 2 years
      }
    });
    
    return NextResponse.json({ id: assessment.id, token }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

**File: app/api/assessment/[id]/submit/route.ts**
```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateFullAssessment } from '@/lib/scoring/formulas';
import { pdfQueue } from '@/lib/queues/setup';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const assessment = await prisma.assessmentResponse.findUnique({
    where: { id: params.id },
    include: {
      questionnaireVersion: {
        include: {
          areas: {
            include: { elements: { include: { questions: true } } }
          }
        }
      }
    }
  });
  
  if (!assessment) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  
  const answers = assessment.answers as Record<string, number>;
  const config = assessment.questionnaireVersion;
  
  const scores = calculateFullAssessment(answers, config);
  
  await prisma.assessmentResponse.update({
    where: { id: params.id },
    data: {
      status: 'SUBMITTED',
      submittedAt: new Date(),
      calculatedScores: scores as any
    }
  });
  
  // Enqueue PDF generation
  await pdfQueue.add('generate-pdf', { assessmentId: params.id });
  
  return NextResponse.json(scores);
}
```

**Verifica:**
- [ ] POST /api/assessment crea draft
- [ ] POST /api/assessment/:id/submit calcola score
- [ ] Status aggiornato a SUBMITTED

---

## 👨‍💼 P4: API Admin

**Obiettivo:** CRUD configurazione + versioning

**File: lib/services/questionnaire.ts**
```typescript
import { prisma } from '@/lib/db';

export async function cloneQuestionnaireVersion(sourceId: string) {
  const source = await prisma.questionnaireVersion.findUnique({
    where: { id: sourceId },
    include: {
      areas: {
        include: { elements: { include: { questions: true } } }
      }
    }
  });
  
  if (!source) throw new Error('Source not found');
  
  const maxVersion = await prisma.questionnaireVersion.aggregate({
    _max: { versionNumber: true }
  });
  
  return await prisma.questionnaireVersion.create({
    data: {
      versionNumber: (maxVersion._max.versionNumber || 0) + 1,
      status: 'DRAFT',
      areas: {
        create: source.areas.map(area => ({
          code: area.code,
          name: area.name,
          weight: area.weight,
          order: area.order,
          elements: {
            create: area.elements.map(elem => ({
              code: elem.code,
              name: elem.name,
              weight: elem.weight,
              order: elem.order,
              questions: {
                create: elem.questions.map(q => ({
                  code: q.code,
                  questionText: q.questionText,
                  levelsDescription: q.levelsDescription,
                  order: q.order
                }))
              }
            }))
          }
        }))
      }
    }
  });
}
```

**Verifica:**
- [ ] Clone versione funziona
- [ ] Publish rende immutabile

---

## 🎨 P5: UI Frontend

**Obiettivo:** Form questionario dinamico con auto-save

**File: app/(public)/assessment/new/page.tsx**
```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NewAssessment() {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const router = useRouter();
  
  useEffect(() => {
    fetch('/api/questionnaire/latest')
      .then(res => res.json())
      .then(data => {
        const allQuestions = [];
        data.areas.forEach(area => {
          area.elements.forEach(elem => {
            elem.questions.forEach(q => {
              allQuestions.push({ ...q, areaName: area.name, elementCode: elem.code });
            });
          });
        });
        setQuestions(allQuestions);
      });
  }, []);
  
  const handleSubmit = async () => {
    const res = await fetch('/api/assessment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userEmail: email, consentGiven: consent })
    });
    
    const { id } = await res.json();
    
    // Update answers
    await fetch(`/api/assessment/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers })
    });
    
    // Submit
    const submitRes = await fetch(`/api/assessment/${id}/submit`, { method: 'POST' });
    const scores = await submitRes.json();
    
    router.push(`/assessment/${id}/results`);
  };
  
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">AI Maturity Assessment</h1>
      
      <div className="mb-8">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border p-2 rounded w-full mb-4"
        />
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mr-2"
          />
          Acconsento al trattamento dati
        </label>
      </div>
      
      {questions.map((q, idx) => (
        <div key={q.id} className="mb-6 p-4 border rounded">
          <p className="font-semibold mb-2">{q.code}: {q.questionText}</p>
          <div className="flex gap-2">
            {[0, 1, 2, 3, 4, 5].map(level => (
              <button
                key={level}
                onClick={() => setAnswers({ ...answers, [q.code]: level })}
                className={`px-4 py-2 rounded ${
                  answers[q.code] === level ? 'bg-blue-600 text-white' : 'bg-gray-200'
                }`}
                data-answer={level}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      ))}
      
      <button
        onClick={handleSubmit}
        disabled={Object.keys(answers).length < 30}
        className="bg-blue-600 text-white px-6 py-3 rounded disabled:opacity-50"
      >
        Invia Assessment
      </button>
    </div>
  );
}
```

**Verifica:**
- [ ] Form renderizza 30 domande
- [ ] Submit funziona
- [ ] Redirect a results

---

## 📄 P6: PDF Generation

**Obiettivo:** Worker Puppeteer per report PDF

**File: lib/workers/pdf-generator.ts**
```typescript
import puppeteer from 'puppeteer';

export async function generatePDF(assessmentId: string): Promise<Buffer> {
  const assessment = await prisma.assessmentResponse.findUnique({
    where: { id: assessmentId }
  });
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial; }
          .score { font-size: 48px; color: #2563eb; }
        </style>
      </head>
      <body>
        <h1>AI Maturity Assessment Report</h1>
        <div class="score">${assessment.calculatedScores.totalScore}</div>
        <p>Livello: ${assessment.calculatedScores.maturityLevel}</p>
      </body>
    </html>
  `;
  
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(html);
  const pdf = await page.pdf({ format: 'A4' });
  await browser.close();
  
  return pdf;
}
```

**File: workers/pdf-worker.ts**
```typescript
import { Worker } from 'bullmq';
import { generatePDF } from '@/lib/workers/pdf-generator';
import fs from 'fs/promises';

const worker = new Worker('pdf-generation', async (job) => {
  const { assessmentId } = job.data;
  const pdf = await generatePDF(assessmentId);
  
  const filename = `assessment-${assessmentId}.pdf`;
  await fs.writeFile(`public/pdfs/${filename}`, pdf);
  
  await prisma.assessmentResponse.update({
    where: { id: assessmentId },
    data: { pdfUrl: `/pdfs/${filename}`, status: 'PDF_GENERATED' }
  });
}, { connection: redis });

console.log('PDF worker started');
```

**Comandi:**
```bash
pnpm tsx workers/pdf-worker.ts &
```

**Verifica:**
- [ ] Submit enqueue job
- [ ] PDF generato in public/pdfs/
- [ ] Status aggiornato

---

## ✉️ P7: Email Worker

**Obiettivo:** Invio email con allegato PDF

**File: workers/email-worker.ts**
```typescript
import { Worker } from 'bullmq';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
});

const worker = new Worker('email-sending', async (job) => {
  const { assessmentId } = job.data;
  const assessment = await prisma.assessmentResponse.findUnique({
    where: { id: assessmentId }
  });
  
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: assessment.userEmail,
    subject: 'Il tuo AI Maturity Assessment',
    html: `<h1>Report pronto!</h1><p>Score: ${assessment.calculatedScores.totalScore}</p>`,
    attachments: [{ path: `public${assessment.pdfUrl}` }]
  });
  
  await prisma.assessmentResponse.update({
    where: { id: assessmentId },
    data: { emailSentAt: new Date(), status: 'EMAIL_SENT' }
  });
}, { connection: redis, attempts: 3 });

console.log('Email worker started');
```

**Verifica:**
- [ ] Email inviata con PDF
- [ ] Status finale: EMAIL_SENT

---

## 🔐 P9: Sicurezza

**Obiettivo:** Rate limiting, headers, validazione

**File: lib/middleware/rate-limit.ts**
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const apiLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m')
});
```

**File: next.config.js**
```javascript
module.exports = {
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000' }
      ]
    }];
  }
};
```

**Verifica:**
- [ ] Rate limit funziona: 429 dopo limite
- [ ] Headers presenti: `curl -I`

---

## 🐳 P11: Docker Deployment

**Obiettivo:** Dockerfile produzione + docker-compose

**File: Dockerfile**
```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
RUN apk add --no-cache chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

**Comandi:**
```bash
docker build -t ai-assessment .
docker-compose -f docker-compose.prod.yml up -d
```

**Verifica:**
- [ ] Build success
- [ ] Stack up: `docker-compose ps`
- [ ] Health check: `curl http://localhost/api/health`

---

## 📚 P12: Documentazione

**Obiettivo:** README + API docs

**File: README.md**
```markdown
# AI Maturity Assessment

## Quick Start
```bash
pnpm install
docker-compose up -d
pnpm prisma migrate dev
pnpm dev
```

## Architecture
- Frontend: Next.js 14 + React + Tailwind
- Backend: Prisma + Postgres
- Queue: BullMQ + Redis
- PDF: Puppeteer

## API
Swagger: http://localhost:3000/api/docs
```

**Verifica:**
- [ ] README presente
- [ ] Setup instructions funzionanti

---

## ✅ CHECKLIST FINALE

Prima di considerare il progetto completo:

- [ ] Tutti test passano (unit + integration + e2e)
- [ ] Coverage > 80%
- [ ] Linting passa: `pnpm lint`
- [ ] Build produzione OK: `pnpm build`
- [ ] Docker stack up completo
- [ ] Health check green
- [ ] Email test inviata con successo
- [ ] PDF generato correttamente
- [ ] Admin può creare nuova versione
- [ ] Calcoli matchano Excel (golden master test OK)

---

## 🎯 PROSSIMI PASSI

1. Deploy su VPS con SSL (Let's Encrypt)
2. Setup monitoring (Prometheus + Grafana)
3. Backup automatici DB
4. Ottimizzazioni performance
5. Internazionalizzazione (i18n)

---

**FINE PROMPT PACK**

Questo documento è pronto per essere eseguito sequenzialmente con Claude Code CLI.
Ogni prompt è autocontenuto e verificabile.

Per domande: support@example.com
