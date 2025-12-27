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
  try {
    console.log('🔢 calculateFullAssessment started');
    console.log('   Answers count:', Object.keys(answers).length);
    console.log('   Areas count:', config.areas?.length || 0);

    const areas: AreaScore[] = [];

    for (const area of config.areas) {
      console.log(`   Processing area: ${area.code} - ${area.name}`);
      const elementScores: ElementScore[] = [];

      for (const element of area.elements) {
        const [q1, q2] = element.questions;

        if (!q1 || !q2) {
          console.warn(`   ⚠️ Missing questions for element ${element.code}`);
          continue;
        }

        const answerA = answers[q1.code];
        const answerB = answers[q2.code];

        if (answerA === undefined || answerB === undefined) {
          console.warn(`   ⚠️ Missing answers for element ${element.code}: A=${answerA}, B=${answerB}`);
          continue;
        }

        const percentage = calculateElementScore(answerA, answerB);

        elementScores.push({
          code: element.code,
          answerA,
          answerB,
          average: (answerA + answerB) / 2,
          percentage
        });
      }

      if (elementScores.length === 0) {
        console.warn(`   ⚠️ No valid element scores for area ${area.code}`);
        continue;
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

    if (areas.length === 0) {
      throw new Error('No valid areas calculated');
    }

    const totalScore = calculateTotalScore(areas.map(a => a.contribution));
    const maturityLevel = classifyMaturityLevel(totalScore);

    console.log('✅ calculateFullAssessment completed:', {
      areasCount: areas.length,
      totalScore,
      maturityLevel
    });

    return { areas, totalScore, maturityLevel };
  } catch (error) {
    console.error('❌ Error in calculateFullAssessment:', error);
    throw error;
  }
}
