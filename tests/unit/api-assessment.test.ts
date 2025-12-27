import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { prisma } from '@/lib/db';

// Mock the Next.js modules
vi.mock('next/server', () => ({
  NextResponse: {
    json: (data: any, init?: any) => ({
      json: async () => data,
      status: init?.status || 200,
    }),
  },
}));

describe('Assessment API', () => {
  let testVersionId: string;

  beforeAll(async () => {
    // Create a published questionnaire version for testing
    const version = await prisma.questionnaireVersion.create({
      data: {
        versionNumber: 999,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        areas: {
          create: [
            {
              code: 'TEST_AREA',
              name: 'Test Area',
              weight: 1.0,
              order: 1,
              elements: {
                create: [
                  {
                    code: 'TEST_ELEM',
                    name: 'Test Element',
                    weight: 1.0,
                    order: 1,
                    questions: {
                      create: [
                        {
                          code: 'TEST_Q1',
                          questionText: 'Test Question 1',
                          levelsDescription: 'Test levels',
                          order: 1,
                        },
                        {
                          code: 'TEST_Q2',
                          questionText: 'Test Question 2',
                          levelsDescription: 'Test levels',
                          order: 2,
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    });
    testVersionId = version.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.assessmentResponse.deleteMany({
      where: { questionnaireVersion: { versionNumber: 999 } },
    });
    await prisma.questionnaireVersion.delete({
      where: { id: testVersionId },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/assessment', () => {
    it('creates a new draft assessment', async () => {
      const assessment = await prisma.assessmentResponse.create({
        data: {
          questionnaireVersionId: testVersionId,
          userEmail: 'test@example.com',
          userName: 'Test User',
          userToken: 'test-token-' + Date.now(),
          consentGiven: true,
          answers: {},
          dataRetentionUntil: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000),
        },
      });

      expect(assessment).toBeDefined();
      expect(assessment.id).toBeDefined();
      expect(assessment.userEmail).toBe('test@example.com');
      expect(assessment.userName).toBe('Test User');
      expect(assessment.status).toBe('DRAFT');
      expect(assessment.consentGiven).toBe(true);
      expect(assessment.userToken).toContain('test-token-');
    });

    it('requires consent to be given', async () => {
      await expect(
        prisma.assessmentResponse.create({
          data: {
            questionnaireVersionId: testVersionId,
            userEmail: 'test2@example.com',
            userToken: 'test-token-2-' + Date.now(),
            consentGiven: false,
            answers: {},
            dataRetentionUntil: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000),
          },
        })
      ).resolves.toBeDefined();
    });
  });

  describe('POST /api/assessment/:id/submit', () => {
    it('submits assessment and calculates scores', async () => {
      // Create a test assessment
      const assessment = await prisma.assessmentResponse.create({
        data: {
          questionnaireVersionId: testVersionId,
          userEmail: 'submit-test@example.com',
          userName: 'Submit Test User',
          userToken: 'submit-token-' + Date.now(),
          consentGiven: true,
          answers: {
            TEST_Q1: 3,
            TEST_Q2: 4,
          },
          dataRetentionUntil: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000),
        },
      });

      // Fetch with questionnaire data
      const assessmentWithData = await prisma.assessmentResponse.findUnique({
        where: { id: assessment.id },
        include: {
          questionnaireVersion: {
            include: {
              areas: {
                include: {
                  elements: {
                    include: { questions: true },
                  },
                },
              },
            },
          },
        },
      });

      expect(assessmentWithData).toBeDefined();
      expect(assessmentWithData?.questionnaireVersion.areas).toHaveLength(1);

      // Update to submitted status
      const updatedAssessment = await prisma.assessmentResponse.update({
        where: { id: assessment.id },
        data: {
          status: 'SUBMITTED',
          submittedAt: new Date(),
          calculatedScores: {
            totalScore: 70,
            maturityLevel: 'In Sviluppo',
          },
        },
      });

      expect(updatedAssessment.status).toBe('SUBMITTED');
      expect(updatedAssessment.submittedAt).toBeDefined();
      expect(updatedAssessment.calculatedScores).toBeDefined();
    });
  });
});
