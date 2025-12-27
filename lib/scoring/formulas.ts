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
