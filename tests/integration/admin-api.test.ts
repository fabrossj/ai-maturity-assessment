import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '@/lib/db';

// Helper function to create a test questionnaire version
async function createTestQuestionnaireVersion(versionNumber: number, status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' = 'DRAFT') {
  return await prisma.questionnaireVersion.create({
    data: {
      versionNumber,
      status,
      publishedAt: status === 'PUBLISHED' ? new Date() : null,
      areas: {
        create: [
          {
            code: 'A1',
            name: 'Governance',
            weight: 0.25,
            order: 1,
            elements: {
              create: [
                {
                  code: 'E1.1',
                  name: 'Strategic Planning',
                  weight: 0.333,
                  order: 1,
                  questions: {
                    create: [
                      {
                        code: 'Q1.1.a',
                        questionText: 'Does your organization have an AI strategy?',
                        levelsDescription: 'Level descriptions...',
                        order: 1,
                        scaleMin: 0,
                        scaleMax: 5
                      },
                      {
                        code: 'Q1.1.b',
                        questionText: 'Is AI integrated into business planning?',
                        levelsDescription: 'Level descriptions...',
                        order: 2,
                        scaleMin: 0,
                        scaleMax: 5
                      }
                    ]
                  }
                }
              ]
            }
          },
          {
            code: 'A2',
            name: 'Culture',
            weight: 0.25,
            order: 2,
            elements: {
              create: [
                {
                  code: 'E2.1',
                  name: 'Innovation Mindset',
                  weight: 0.333,
                  order: 1,
                  questions: {
                    create: [
                      {
                        code: 'Q2.1.a',
                        questionText: 'Does your team embrace innovation?',
                        levelsDescription: 'Level descriptions...',
                        order: 1,
                        scaleMin: 0,
                        scaleMax: 5
                      }
                    ]
                  }
                }
              ]
            }
          },
          {
            code: 'A3',
            name: 'Digital Maturity',
            weight: 0.16,
            order: 3,
            elements: {
              create: []
            }
          },
          {
            code: 'A4',
            name: 'Infrastructure',
            weight: 0.22,
            order: 4,
            elements: {
              create: []
            }
          },
          {
            code: 'A5',
            name: 'Innovation',
            weight: 0.12,
            order: 5,
            elements: {
              create: []
            }
          }
        ]
      }
    },
    include: {
      areas: {
        include: {
          elements: {
            include: {
              questions: true
            }
          }
        }
      }
    }
  });
}

// Clean up test data (preserving unit test data with versionNumber 999)
async function cleanupTestData() {
  // Delete in correct order to respect foreign key constraints
  try {
    // First delete all assessment responses except those linked to version 999 (unit tests)
    await prisma.assessmentResponse.deleteMany({
      where: {
        questionnaireVersion: {
          versionNumber: {
            not: 999
          }
        }
      }
    });

    // Then delete the questionnaire structure from bottom to top (except version 999)
    await prisma.question.deleteMany({
      where: {
        element: {
          area: {
            questionnaireVersion: {
              versionNumber: {
                not: 999
              }
            }
          }
        }
      }
    });

    await prisma.element.deleteMany({
      where: {
        area: {
          questionnaireVersion: {
            versionNumber: {
              not: 999
            }
          }
        }
      }
    });

    await prisma.area.deleteMany({
      where: {
        questionnaireVersion: {
          versionNumber: {
            not: 999
          }
        }
      }
    });

    // Finally delete the versions (except 999)
    await prisma.questionnaireVersion.deleteMany({
      where: {
        versionNumber: {
          not: 999
        }
      }
    });
  } catch (error) {
    console.error('Error during cleanup:', error);
    throw error;
  }
}

describe('Admin API Integration Tests', () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  describe('Questionnaire Version Management', () => {
    it('should list all questionnaire versions', async () => {
      // Create test versions with unique version numbers to avoid conflicts
      const v1 = await createTestQuestionnaireVersion(100, 'PUBLISHED');
      const v2 = await createTestQuestionnaireVersion(200, 'DRAFT');

      // Query only the versions we created in this test
      const versions = await prisma.questionnaireVersion.findMany({
        where: {
          id: {
            in: [v1.id, v2.id]
          }
        },
        orderBy: { versionNumber: 'desc' }
      });

      expect(versions).toHaveLength(2);
      expect(versions[0].versionNumber).toBe(200);
      expect(versions[1].versionNumber).toBe(100);
    });

    it('should get a specific questionnaire version', async () => {
      const version = await createTestQuestionnaireVersion(1);

      const retrieved = await prisma.questionnaireVersion.findUnique({
        where: { id: version.id },
        include: {
          areas: {
            include: {
              elements: {
                include: {
                  questions: true
                }
              }
            }
          }
        }
      });

      expect(retrieved).not.toBeNull();
      expect(retrieved?.versionNumber).toBe(1);
      expect(retrieved?.areas).toHaveLength(5);
    });

    it('should clone a questionnaire version', async () => {
      const sourceVersion = await createTestQuestionnaireVersion(1, 'PUBLISHED');

      // Get max version number
      const maxVersion = await prisma.questionnaireVersion.aggregate({
        _max: { versionNumber: true }
      });

      // Clone the version
      const newVersion = await prisma.questionnaireVersion.create({
        data: {
          versionNumber: (maxVersion._max.versionNumber || 0) + 1,
          status: 'DRAFT',
          areas: {
            create: sourceVersion.areas.map(area => ({
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
                      order: q.order,
                      scaleMin: q.scaleMin,
                      scaleMax: q.scaleMax
                    }))
                  }
                }))
              }
            }))
          }
        },
        include: {
          areas: {
            include: {
              elements: {
                include: {
                  questions: true
                }
              }
            }
          }
        }
      });

      expect(newVersion.versionNumber).toBe(2);
      expect(newVersion.status).toBe('DRAFT');
      expect(newVersion.areas).toHaveLength(sourceVersion.areas.length);
    });

    it('should publish a DRAFT version', async () => {
      const draftVersion = await createTestQuestionnaireVersion(1, 'DRAFT');

      // Archive existing published versions
      await prisma.questionnaireVersion.updateMany({
        where: { status: 'PUBLISHED' },
        data: { status: 'ARCHIVED' }
      });

      // Publish the draft
      const published = await prisma.questionnaireVersion.update({
        where: { id: draftVersion.id },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date()
        }
      });

      expect(published.status).toBe('PUBLISHED');
      expect(published.publishedAt).not.toBeNull();
    });

    it('should archive a published version', async () => {
      const publishedVersion = await createTestQuestionnaireVersion(1, 'PUBLISHED');

      const archived = await prisma.questionnaireVersion.update({
        where: { id: publishedVersion.id },
        data: { status: 'ARCHIVED' }
      });

      expect(archived.status).toBe('ARCHIVED');
    });

    it('should delete a DRAFT version with no assessments', async () => {
      const draftVersion = await createTestQuestionnaireVersion(1, 'DRAFT');

      await prisma.questionnaireVersion.delete({
        where: { id: draftVersion.id }
      });

      const deleted = await prisma.questionnaireVersion.findUnique({
        where: { id: draftVersion.id }
      });

      expect(deleted).toBeNull();
    });

    it('should prevent deletion of version with assessments', async () => {
      const version = await createTestQuestionnaireVersion(1, 'DRAFT');

      // Create an assessment using this version
      await prisma.assessmentResponse.create({
        data: {
          questionnaireVersionId: version.id,
          userEmail: 'test@example.com',
          userToken: 'test-token-123',
          consentGiven: true,
          answers: {},
          dataRetentionUntil: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000)
        }
      });

      // Check if version has assessments
      const versionWithCount = await prisma.questionnaireVersion.findUnique({
        where: { id: version.id },
        include: {
          _count: {
            select: { assessments: true }
          }
        }
      });

      expect(versionWithCount?._count.assessments).toBeGreaterThan(0);
    });
  });

  describe('Area, Element, and Question Updates', () => {
    it('should update area details in DRAFT version', async () => {
      const version = await createTestQuestionnaireVersion(1, 'DRAFT');
      const area = version.areas[0];

      const updated = await prisma.area.update({
        where: { id: area.id },
        data: {
          name: 'Updated Governance',
          weight: 0.3
        }
      });

      expect(updated.name).toBe('Updated Governance');
      expect(updated.weight).toBe(0.3);
    });

    it('should update element details in DRAFT version', async () => {
      const version = await createTestQuestionnaireVersion(1, 'DRAFT');
      const element = version.areas[0].elements[0];

      const updated = await prisma.element.update({
        where: { id: element.id },
        data: {
          name: 'Updated Strategic Planning',
          description: 'New description'
        }
      });

      expect(updated.name).toBe('Updated Strategic Planning');
      expect(updated.description).toBe('New description');
    });

    it('should update question details in DRAFT version', async () => {
      const version = await createTestQuestionnaireVersion(1, 'DRAFT');
      const question = version.areas[0].elements[0].questions[0];

      const updated = await prisma.question.update({
        where: { id: question.id },
        data: {
          questionText: 'Updated question text?',
          levelsDescription: 'Updated levels...'
        }
      });

      expect(updated.questionText).toBe('Updated question text?');
      expect(updated.levelsDescription).toBe('Updated levels...');
    });
  });

  describe('Weight Validation', () => {
    it('should validate area weights sum to 1.0', async () => {
      const version = await createTestQuestionnaireVersion(1, 'DRAFT');

      const versionWithAreas = await prisma.questionnaireVersion.findUnique({
        where: { id: version.id },
        include: {
          areas: {
            select: { weight: true }
          }
        }
      });

      const totalWeight = versionWithAreas!.areas.reduce((sum, area) => sum + area.weight, 0);

      expect(Math.abs(totalWeight - 1.0)).toBeLessThan(0.001);
    });

    it('should detect invalid weight distribution', async () => {
      const version = await createTestQuestionnaireVersion(1, 'DRAFT');

      // Update one area weight to make total invalid
      await prisma.area.update({
        where: { id: version.areas[0].id },
        data: { weight: 0.5 }
      });

      const versionWithAreas = await prisma.questionnaireVersion.findUnique({
        where: { id: version.id },
        include: {
          areas: {
            select: { weight: true }
          }
        }
      });

      const totalWeight = versionWithAreas!.areas.reduce((sum, area) => sum + area.weight, 0);

      expect(Math.abs(totalWeight - 1.0)).toBeGreaterThan(0.001);
    });
  });

  describe('Version Status Transitions', () => {
    it('should handle DRAFT -> PUBLISHED -> ARCHIVED lifecycle', async () => {
      // Create DRAFT
      const version = await createTestQuestionnaireVersion(1, 'DRAFT');
      expect(version.status).toBe('DRAFT');

      // Publish
      const published = await prisma.questionnaireVersion.update({
        where: { id: version.id },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date()
        }
      });
      expect(published.status).toBe('PUBLISHED');

      // Archive
      const archived = await prisma.questionnaireVersion.update({
        where: { id: version.id },
        data: { status: 'ARCHIVED' }
      });
      expect(archived.status).toBe('ARCHIVED');
    });

    it('should ensure only one PUBLISHED version at a time', async () => {
      const v1 = await createTestQuestionnaireVersion(1, 'PUBLISHED');
      const v2 = await createTestQuestionnaireVersion(2, 'DRAFT');

      // Archive previous published versions before publishing new one
      await prisma.questionnaireVersion.updateMany({
        where: { status: 'PUBLISHED' },
        data: { status: 'ARCHIVED' }
      });

      // Publish v2
      await prisma.questionnaireVersion.update({
        where: { id: v2.id },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date()
        }
      });

      // Check that only v2 is published
      const publishedVersions = await prisma.questionnaireVersion.findMany({
        where: { status: 'PUBLISHED' }
      });

      expect(publishedVersions).toHaveLength(1);
      expect(publishedVersions[0].id).toBe(v2.id);
    });
  });

  describe('Deep Clone Verification', () => {
    it('should clone entire hierarchy including questions', async () => {
      const source = await createTestQuestionnaireVersion(1, 'PUBLISHED');

      // Count questions in source
      const sourceQuestionCount = source.areas.reduce(
        (total, area) => total + area.elements.reduce(
          (elemTotal, elem) => elemTotal + elem.questions.length,
          0
        ),
        0
      );

      // Clone
      const maxVersion = await prisma.questionnaireVersion.aggregate({
        _max: { versionNumber: true }
      });

      const clone = await prisma.questionnaireVersion.create({
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
                      order: q.order,
                      scaleMin: q.scaleMin,
                      scaleMax: q.scaleMax
                    }))
                  }
                }))
              }
            }))
          }
        },
        include: {
          areas: {
            include: {
              elements: {
                include: {
                  questions: true
                }
              }
            }
          }
        }
      });

      // Count questions in clone
      const cloneQuestionCount = clone.areas.reduce(
        (total, area) => total + area.elements.reduce(
          (elemTotal, elem) => elemTotal + elem.questions.length,
          0
        ),
        0
      );

      expect(cloneQuestionCount).toBe(sourceQuestionCount);
      expect(clone.id).not.toBe(source.id);
    });
  });
});
