import { describe, it, expect } from 'vitest';
import {
  calculateElementScore,
  calculateAreaScore,
  calculateTotalScore,
  classifyMaturityLevel,
  calculateFullAssessment
} from '@/lib/scoring/formulas';

describe('Scoring Engine', () => {
  it('calcola score elemento correttamente', () => {
    expect(calculateElementScore(3, 4)).toBeCloseTo(70, 2);
    expect(calculateElementScore(0, 0)).toBe(0);
    expect(calculateElementScore(5, 5)).toBe(100);
    expect(calculateElementScore(2, 3)).toBeCloseTo(50, 2);
    expect(calculateElementScore(1, 1)).toBe(20);
  });

  it('calcola score area correttamente', () => {
    expect(calculateAreaScore([50, 60, 70])).toBeCloseTo(60, 2);
    expect(calculateAreaScore([100, 100, 100])).toBe(100);
    expect(calculateAreaScore([0, 0, 0])).toBe(0);
    expect(calculateAreaScore([25, 75])).toBe(50);
  });

  it('calcola score totale correttamente', () => {
    expect(calculateTotalScore([10, 20, 30])).toBe(60);
    expect(calculateTotalScore([25, 25, 25, 25])).toBe(100);
    expect(calculateTotalScore([0, 0, 0])).toBe(0);
  });

  it('classifica livello maturità', () => {
    expect(classifyMaturityLevel(15)).toBe('Iniziale');
    expect(classifyMaturityLevel(35)).toBe('Consapevole');
    expect(classifyMaturityLevel(55)).toBe('In Sviluppo');
    expect(classifyMaturityLevel(75)).toBe('Avanzato');
    expect(classifyMaturityLevel(95)).toBe('Leader');
    expect(classifyMaturityLevel(20)).toBe('Iniziale');
    expect(classifyMaturityLevel(40)).toBe('Consapevole');
    expect(classifyMaturityLevel(60)).toBe('In Sviluppo');
    expect(classifyMaturityLevel(80)).toBe('Avanzato');
  });

  it('calcola assessment completo correttamente', () => {
    const mockConfig = {
      areas: [
        {
          code: 'A1',
          name: 'Area 1',
          weight: 0.5,
          elements: [
            {
              code: 'E1',
              questions: [
                { code: 'Q1' },
                { code: 'Q2' }
              ]
            }
          ]
        },
        {
          code: 'A2',
          name: 'Area 2',
          weight: 0.5,
          elements: [
            {
              code: 'E2',
              questions: [
                { code: 'Q3' },
                { code: 'Q4' }
              ]
            }
          ]
        }
      ]
    };

    const mockAnswers = {
      Q1: 3,
      Q2: 4,
      Q3: 2,
      Q4: 3
    };

    const result = calculateFullAssessment(mockAnswers, mockConfig);

    expect(result.areas).toHaveLength(2);
    expect(result.areas[0].code).toBe('A1');
    expect(result.areas[0].elements).toHaveLength(1);
    expect(result.areas[0].elements[0].answerA).toBe(3);
    expect(result.areas[0].elements[0].answerB).toBe(4);
    expect(result.areas[0].elements[0].average).toBe(3.5);
    expect(result.areas[0].elements[0].percentage).toBe(70);
    expect(result.areas[0].areaPercentage).toBe(70);
    expect(result.areas[0].contribution).toBe(35);

    expect(result.areas[1].elements[0].percentage).toBe(50);
    expect(result.areas[1].areaPercentage).toBe(50);
    expect(result.areas[1].contribution).toBe(25);

    expect(result.totalScore).toBe(60);
    expect(result.maturityLevel).toBe('In Sviluppo');
  });
});
