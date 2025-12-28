import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Check if version 1 already exists
  let questionnaireV1 = await prisma.questionnaireVersion.findUnique({
    where: { versionNumber: 1 },
  });

  if (questionnaireV1) {
    console.log('ℹ️  Questionnaire Version 1 already exists, skipping seed...');
    console.log('\n📊 Existing data in database:');
    const versionCount = await prisma.questionnaireVersion.count();
    const areaCount = await prisma.area.count();
    const userCount = await prisma.user.count();
    console.log(`- ${versionCount} Questionnaire Version(s)`);
    console.log(`- ${areaCount} Area(s)`);
    console.log(`- ${userCount} User(s)`);
    return;
  }

  // Create questionnaire version 1
  console.log('Creating Questionnaire Version 1...');
  questionnaireV1 = await prisma.questionnaireVersion.create({
    data: {
      versionNumber: 1,
      status: 'PUBLISHED',
      publishedAt: new Date(),
    },
  });
  console.log(`✅ Created Questionnaire Version ${questionnaireV1.versionNumber}`);

  // Area 1: Governance e Strategia (25%)
  console.log('Creating Area 1: Governance e Strategia...');
  const area1 = await prisma.area.create({
    data: {
      questionnaireVersionId: questionnaireV1.id,
      code: '1',
      name: 'Governance e Strategia',
      description: 'Valutazione della strategia AI e della governance aziendale',
      weight: 0.25,
      order: 1,
      elements: {
        create: [
          {
            code: '1.1',
            name: 'Strategia AI definita',
            description: 'Presenza di una roadmap e strategia AI formale',
            weight: 0.3333,
            order: 1,
            questions: {
              create: [
                {
                  code: '1.1.a',
                  questionText:
                    "In quale fase si trova attualmente l'organizzazione rispetto alla definizione di una roadmap per l'intelligenza artificiale?",
                  levelsDescription:
                    '0=Inesistente | 1=Mai discussa formalmente | 2=In discussione iniziale | 3=Abbozzata | 4=Documentata e condivisa | 5=Formalizzata e in implementazione',
                  order: 1,
                  scaleMin: 0,
                  scaleMax: 5,
                },
                {
                  code: '1.1.b',
                  questionText:
                    "Quanto è chiara la vision aziendale riguardo all'adozione dell'AI nei prossimi 3-5 anni?",
                  levelsDescription:
                    '0=Assente | 1=Vaga e generica | 2=Abbozzata | 3=Definita ma non comunicata | 4=Chiara e comunicata | 5=Chiara, comunicata e condivisa',
                  order: 2,
                  scaleMin: 0,
                  scaleMax: 5,
                },
              ],
            },
          },
          {
            code: '1.2',
            name: 'Team dedicato AI',
            description: 'Presenza e competenza di un team dedicato all\'AI',
            weight: 0.3333,
            order: 2,
            questions: {
              create: [
                {
                  code: '1.2.a',
                  questionText:
                    "Esiste un team o una figura dedicata alla supervisione e implementazione di progetti AI?",
                  levelsDescription:
                    '0=Nessuno | 1=Discusso ma non attivo | 2=Team informale | 3=Figura dedicata part-time | 4=Team formale con risorse part-time | 5=Team dedicato full-time',
                  order: 1,
                  scaleMin: 0,
                  scaleMax: 5,
                },
                {
                  code: '1.2.b',
                  questionText:
                    'Qual è il livello di competenza AI presente nel team dedicato?',
                  levelsDescription:
                    '0=Nessuna competenza | 1=Conoscenza base | 2=Competenze teoriche | 3=Esperienza pratica limitata | 4=Competenze avanzate | 5=Esperti riconosciuti',
                  order: 2,
                  scaleMin: 0,
                  scaleMax: 5,
                },
              ],
            },
          },
          {
            code: '1.3',
            name: 'Allineamento strategico',
            description: 'Allineamento tra strategia AI e obiettivi aziendali',
            weight: 0.3333,
            order: 3,
            questions: {
              create: [
                {
                  code: '1.3.a',
                  questionText:
                    'Quanto è integrata la strategia AI con gli obiettivi di business generali?',
                  levelsDescription:
                    '0=Nessuna integrazione | 1=Connessione vaga | 2=Allineamento parziale | 3=Buon allineamento | 4=Forte integrazione | 5=Completamente integrata',
                  order: 1,
                  scaleMin: 0,
                  scaleMax: 5,
                },
                {
                  code: '1.3.b',
                  questionText:
                    "Esiste un processo di revisione periodica dell'allineamento strategico AI-Business?",
                  levelsDescription:
                    '0=Inesistente | 1=Discusso occasionalmente | 2=Revisioni sporadiche | 3=Revisioni annuali | 4=Revisioni semestrali | 5=Monitoraggio continuo',
                  order: 2,
                  scaleMin: 0,
                  scaleMax: 5,
                },
              ],
            },
          },
        ],
      },
    },
  });
  console.log(`✅ Created Area 1 with ${3} elements`);

  // Area 2: Cultura Aziendale e Change Management (25%)
  console.log('Creating Area 2: Cultura Aziendale e Change Management...');
  const area2 = await prisma.area.create({
    data: {
      questionnaireVersionId: questionnaireV1.id,
      code: '2',
      name: 'Cultura Aziendale e Change Management',
      description: 'Valutazione della cultura e apertura al cambiamento',
      weight: 0.25,
      order: 2,
      elements: {
        create: [
          {
            code: '2.1',
            name: 'Conoscenza e accettazione AI',
            description: 'Livello di consapevolezza e accettazione dell\'AI in azienda',
            weight: 0.3333,
            order: 1,
            questions: {
              create: [
                {
                  code: '2.1.a',
                  questionText:
                    "Qual è il livello generale di conoscenza dell'AI tra i dipendenti?",
                  levelsDescription:
                    '0=Nullo | 1=Consapevolezza minima | 2=Conoscenza superficiale | 3=Comprensione base | 4=Buona conoscenza | 5=Conoscenza approfondita',
                  order: 1,
                  scaleMin: 0,
                  scaleMax: 5,
                },
                {
                  code: '2.1.b',
                  questionText:
                    "Quanto è diffusa l'accettazione dell'AI come strumento di lavoro?",
                  levelsDescription:
                    '0=Forte resistenza | 1=Scetticismo diffuso | 2=Accettazione passiva | 3=Interesse moderato | 4=Buona accettazione | 5=Entusiasmo diffuso',
                  order: 2,
                  scaleMin: 0,
                  scaleMax: 5,
                },
              ],
            },
          },
          {
            code: '2.2',
            name: 'Processi di change management',
            description: 'Presenza e efficacia dei processi di gestione del cambiamento',
            weight: 0.3333,
            order: 2,
            questions: {
              create: [
                {
                  code: '2.2.a',
                  questionText:
                    'Esistono processi formali di change management per nuove tecnologie?',
                  levelsDescription:
                    '0=Inesistenti | 1=Informali | 2=In fase di definizione | 3=Definiti ma non sempre applicati | 4=Applicati regolarmente | 5=Processi maturi e ottimizzati',
                  order: 1,
                  scaleMin: 0,
                  scaleMax: 5,
                },
                {
                  code: '2.2.b',
                  questionText:
                    "Quanto è efficace la comunicazione interna sui cambiamenti tecnologici?",
                  levelsDescription:
                    '0=Assente | 1=Scarsa | 2=Occasionale | 3=Regolare | 4=Efficace | 5=Eccellente e proattiva',
                  order: 2,
                  scaleMin: 0,
                  scaleMax: 5,
                },
              ],
            },
          },
          {
            code: '2.3',
            name: 'Formazione continua',
            description: 'Programmi di formazione e upskilling su AI',
            weight: 0.3333,
            order: 3,
            questions: {
              create: [
                {
                  code: '2.3.a',
                  questionText:
                    "Sono disponibili programmi di formazione sull'AI per i dipendenti?",
                  levelsDescription:
                    '0=Nessuno | 1=Risorse informali | 2=Corsi occasionali | 3=Programma base | 4=Programma strutturato | 5=Programma completo e personalizzato',
                  order: 1,
                  scaleMin: 0,
                  scaleMax: 5,
                },
                {
                  code: '2.3.b',
                  questionText:
                    'Quanto è alta la partecipazione ai programmi di formazione AI?',
                  levelsDescription:
                    '0=Nessuna partecipazione | 1=Molto bassa (<10%) | 2=Bassa (10-25%) | 3=Moderata (25-50%) | 4=Alta (50-75%) | 5=Molto alta (>75%)',
                  order: 2,
                  scaleMin: 0,
                  scaleMax: 5,
                },
              ],
            },
          },
        ],
      },
    },
  });
  console.log(`✅ Created Area 2 with ${3} elements`);

  // Area 3: Maturità Digitale Dipendenti (16%)
  console.log('Creating Area 3: Maturità Digitale Dipendenti...');
  const area3 = await prisma.area.create({
    data: {
      questionnaireVersionId: questionnaireV1.id,
      code: '3',
      name: 'Maturità Digitale Dipendenti',
      description: 'Competenze digitali e apertura all\'innovazione dei dipendenti',
      weight: 0.16,
      order: 3,
      elements: {
        create: [
          {
            code: '3.1',
            name: 'Competenze digitali',
            description: 'Livello generale di competenze digitali',
            weight: 0.3333,
            order: 1,
            questions: {
              create: [
                {
                  code: '3.1.a',
                  questionText:
                    'Qual è il livello medio di competenze digitali dei dipendenti?',
                  levelsDescription:
                    '0=Base | 1=Elementare | 2=Discreto | 3=Buono | 4=Avanzato | 5=Esperto',
                  order: 1,
                  scaleMin: 0,
                  scaleMax: 5,
                },
                {
                  code: '3.1.b',
                  questionText:
                    'Quanto facilmente i dipendenti adottano nuovi strumenti digitali?',
                  levelsDescription:
                    '0=Con grande difficoltà | 1=Con difficoltà | 2=Con supporto esteso | 3=Con supporto moderato | 4=Autonomamente | 5=Con entusiasmo',
                  order: 2,
                  scaleMin: 0,
                  scaleMax: 5,
                },
              ],
            },
          },
          {
            code: '3.2',
            name: 'Apertura a nuovi strumenti',
            description: 'Attitudine verso l\'adozione di nuove tecnologie',
            weight: 0.3333,
            order: 2,
            questions: {
              create: [
                {
                  code: '3.2.a',
                  questionText:
                    "Quanto è diffusa l'apertura mentale verso nuovi strumenti tecnologici?",
                  levelsDescription:
                    '0=Forte resistenza | 1=Resistenza moderata | 2=Neutralità | 3=Apertura moderata | 4=Buona apertura | 5=Forte entusiasmo',
                  order: 1,
                  scaleMin: 0,
                  scaleMax: 5,
                },
                {
                  code: '3.2.b',
                  questionText:
                    'I dipendenti propongono attivamente nuove soluzioni digitali?',
                  levelsDescription:
                    '0=Mai | 1=Raramente | 2=Occasionalmente | 3=Regolarmente | 4=Frequentemente | 5=Costantemente',
                  order: 2,
                  scaleMin: 0,
                  scaleMax: 5,
                },
              ],
            },
          },
          {
            code: '3.3',
            name: 'Preoccupazioni su AI',
            description: 'Gestione delle preoccupazioni legate all\'AI',
            weight: 0.3333,
            order: 3,
            questions: {
              create: [
                {
                  code: '3.3.a',
                  questionText:
                    "Quanto sono diffuse le preoccupazioni sull'impatto dell'AI sul lavoro?",
                  levelsDescription:
                    '0=Panico diffuso | 1=Forte preoccupazione | 2=Moderata preoccupazione | 3=Bassa preoccupazione | 4=Minima preoccupazione | 5=Nessuna preoccupazione',
                  order: 1,
                  scaleMin: 0,
                  scaleMax: 5,
                },
                {
                  code: '3.3.b',
                  questionText:
                    'Esistono iniziative per affrontare le preoccupazioni dei dipendenti?',
                  levelsDescription:
                    '0=Nessuna | 1=Discussioni informali | 2=Iniziative occasionali | 3=Programma base | 4=Programma strutturato | 5=Sistema completo di supporto',
                  order: 2,
                  scaleMin: 0,
                  scaleMax: 5,
                },
              ],
            },
          },
        ],
      },
    },
  });
  console.log(`✅ Created Area 3 with ${3} elements`);

  // Area 4: Infrastruttura Tecnologica e Dati (22%)
  console.log('Creating Area 4: Infrastruttura Tecnologica e Dati...');
  const area4 = await prisma.area.create({
    data: {
      questionnaireVersionId: questionnaireV1.id,
      code: '4',
      name: 'Infrastruttura Tecnologica e Dati',
      description: 'Valutazione dell\'infrastruttura IT e della gestione dati',
      weight: 0.22,
      order: 4,
      elements: {
        create: [
          {
            code: '4.1',
            name: 'Infrastruttura adeguata',
            description: 'Adeguatezza dell\'infrastruttura tecnologica per AI',
            weight: 0.3333,
            order: 1,
            questions: {
              create: [
                {
                  code: '4.1.a',
                  questionText:
                    "L'infrastruttura IT attuale è adeguata per supportare soluzioni AI?",
                  levelsDescription:
                    '0=Completamente inadeguata | 1=Molto limitata | 2=Parzialmente adeguata | 3=Adeguata per progetti base | 4=Buona per progetti avanzati | 5=Eccellente e scalabile',
                  order: 1,
                  scaleMin: 0,
                  scaleMax: 5,
                },
                {
                  code: '4.1.b',
                  questionText:
                    "Quanto è moderna e aggiornata l'infrastruttura cloud/on-premise?",
                  levelsDescription:
                    '0=Obsoleta | 1=Datata | 2=Parzialmente aggiornata | 3=Moderna | 4=Molto moderna | 5=All\'avanguardia',
                  order: 2,
                  scaleMin: 0,
                  scaleMax: 5,
                },
              ],
            },
          },
          {
            code: '4.2',
            name: 'Accessibilità dati',
            description: 'Disponibilità e qualità dei dati aziendali',
            weight: 0.3333,
            order: 2,
            questions: {
              create: [
                {
                  code: '4.2.a',
                  questionText:
                    'Quanto sono accessibili i dati necessari per progetti AI?',
                  levelsDescription:
                    '0=Inaccessibili | 1=Molto difficili da accedere | 2=Accessibili con difficoltà | 3=Moderatamente accessibili | 4=Facilmente accessibili | 5=Immediatamente disponibili',
                  order: 1,
                  scaleMin: 0,
                  scaleMax: 5,
                },
                {
                  code: '4.2.b',
                  questionText:
                    'Qual è la qualità generale dei dati aziendali?',
                  levelsDescription:
                    '0=Molto scarsa | 1=Scarsa | 2=Sufficiente | 3=Buona | 4=Molto buona | 5=Eccellente',
                  order: 2,
                  scaleMin: 0,
                  scaleMax: 5,
                },
              ],
            },
          },
          {
            code: '4.3',
            name: 'Governance dei dati',
            description: 'Processi e policy di gestione dei dati',
            weight: 0.3333,
            order: 3,
            questions: {
              create: [
                {
                  code: '4.3.a',
                  questionText:
                    'Esistono policy formali di governance dei dati?',
                  levelsDescription:
                    '0=Inesistenti | 1=Informali | 2=In fase di definizione | 3=Definite parzialmente | 4=Definite e applicate | 5=Mature e certificate',
                  order: 1,
                  scaleMin: 0,
                  scaleMax: 5,
                },
                {
                  code: '4.3.b',
                  questionText:
                    'Quanto è efficace la gestione della privacy e sicurezza dei dati?',
                  levelsDescription:
                    '0=Inesistente | 1=Minima | 2=Base | 3=Adeguata | 4=Robusta | 5=Eccellente e certificata',
                  order: 2,
                  scaleMin: 0,
                  scaleMax: 5,
                },
              ],
            },
          },
        ],
      },
    },
  });
  console.log(`✅ Created Area 4 with ${3} elements`);

  // Area 5: Capacità di Innovazione e Ricerca (12%)
  console.log('Creating Area 5: Capacità di Innovazione e Ricerca...');
  const area5 = await prisma.area.create({
    data: {
      questionnaireVersionId: questionnaireV1.id,
      code: '5',
      name: 'Capacità di Innovazione e Ricerca',
      description: 'Investimenti e progetti di ricerca e sviluppo',
      weight: 0.12,
      order: 5,
      elements: {
        create: [
          {
            code: '5.1',
            name: 'Investimento in R&D',
            description: 'Risorse dedicate a ricerca e sviluppo',
            weight: 0.3333,
            order: 1,
            questions: {
              create: [
                {
                  code: '5.1.a',
                  questionText:
                    "Qual è il livello di investimento in R&D sull'AI?",
                  levelsDescription:
                    '0=Nessuno | 1=Minimo (<1% budget IT) | 2=Basso (1-3%) | 3=Moderato (3-5%) | 4=Significativo (5-10%) | 5=Elevato (>10%)',
                  order: 1,
                  scaleMin: 0,
                  scaleMax: 5,
                },
                {
                  code: '5.1.b',
                  questionText:
                    "Esistono budget dedicati specificamente all'innovazione AI?",
                  levelsDescription:
                    '0=Nessuno | 1=Budget generico | 2=Budget condiviso | 3=Budget dedicato limitato | 4=Budget dedicato adeguato | 5=Budget dedicato significativo',
                  order: 2,
                  scaleMin: 0,
                  scaleMax: 5,
                },
              ],
            },
          },
          {
            code: '5.2',
            name: 'Collaborazioni esterne',
            description: 'Partnership con università, centri di ricerca, startup',
            weight: 0.3333,
            order: 2,
            questions: {
              create: [
                {
                  code: '5.2.a',
                  questionText:
                    "L'azienda collabora con università o centri di ricerca su temi AI?",
                  levelsDescription:
                    '0=Mai | 1=Contatti informali | 2=Progetti occasionali | 3=Collaborazioni regolari | 4=Partnership strutturate | 5=Ecosistema consolidato',
                  order: 1,
                  scaleMin: 0,
                  scaleMax: 5,
                },
                {
                  code: '5.2.b',
                  questionText:
                    'Esistono partnership con startup o vendor AI?',
                  levelsDescription:
                    '0=Nessuna | 1=Contatti esplorativi | 2=Pilot occasionali | 3=Partnership attive | 4=Ecosistema di partner | 5=Network strategico',
                  order: 2,
                  scaleMin: 0,
                  scaleMax: 5,
                },
              ],
            },
          },
          {
            code: '5.3',
            name: 'Progetti pilota',
            description: 'Sperimentazione attraverso progetti pilota AI',
            weight: 0.3333,
            order: 3,
            questions: {
              create: [
                {
                  code: '5.3.a',
                  questionText:
                    'Quanti progetti pilota AI sono stati avviati negli ultimi 12 mesi?',
                  levelsDescription:
                    '0=Nessuno | 1=1 progetto | 2=2-3 progetti | 3=4-5 progetti | 4=6-10 progetti | 5=>10 progetti',
                  order: 1,
                  scaleMin: 0,
                  scaleMax: 5,
                },
                {
                  code: '5.3.b',
                  questionText:
                    'Qual è il tasso di successo dei progetti pilota AI?',
                  levelsDescription:
                    '0=N/A o 0% | 1=<20% | 2=20-40% | 3=40-60% | 4=60-80% | 5=>80%',
                  order: 2,
                  scaleMin: 0,
                  scaleMax: 5,
                },
              ],
            },
          },
        ],
      },
    },
  });
  console.log(`✅ Created Area 5 with ${3} elements`);

  // Create admin users (using upsert to avoid duplicates)
  console.log('Creating admin users...');
  const adminPassword = await bcrypt.hash('admin123', 10);
  const superAdminPassword = await bcrypt.hash('superadmin123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: adminPassword,
      role: 'ADMIN',
      name: 'Admin User',
    },
  });

  await prisma.user.upsert({
    where: { email: 'superadmin@example.com' },
    update: {},
    create: {
      email: 'superadmin@example.com',
      passwordHash: superAdminPassword,
      role: 'SUPER_ADMIN',
      name: 'Super Admin User',
    },
  });
  console.log('✅ Created/verified 2 admin users');

  console.log('\n🎉 Database seeding completed successfully!');
  console.log('\n📊 Summary:');
  console.log('- 1 Questionnaire Version (v1)');
  console.log('- 5 Areas');
  console.log('- 15 Elements (3 per area)');
  console.log('- 30 Questions (2 per element)');
  console.log('- 2 Admin Users');
  console.log('\n🔐 Admin credentials:');
  console.log('   admin@example.com / admin123');
  console.log('   superadmin@example.com / superadmin123');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
