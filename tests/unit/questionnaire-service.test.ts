import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '@/lib/db';
import {
  cloneQuestionnaireVersion,
  publishQuestionnaireVersion,
  archiveQuestionnaireVersion,
  deleteQuestionnaireVersion,
  updateArea,
  updateElement,
  updateQuestion,
  validateAreaWeights,
  getQuestionnaireVersion,
  getLatestPublishedVersion,
  getAllQuestionnaireVersions
} from '@/lib/services/questionnaire';

// Mock Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    questionnaireVersion: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn()
    },
    area: {
      update: vi.fn()
    },
    element: {
      update: vi.fn()
    },
    question: {
      update: vi.fn()
    }
  }
}));

describe('Questionnaire Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('cloneQuestionnaireVersion', () => {
    it('should clone a questionnaire version successfully', async () => {
      const sourceVersion = {
        id: 'source-id',
        versionNumber: 1,
        status: 'PUBLISHED',
        areas: [
          {
            code: 'A1',
            name: 'Area 1',
            description: 'Test area',
            weight: 0.25,
            order: 1,
            elements: [
              {
                code: 'E1.1',
                name: 'Element 1.1',
                description: 'Test element',
                weight: 0.333,
                order: 1,
                questions: [
                  {
                    code: 'Q1.1.a',
                    questionText: 'Question 1?',
                    levelsDescription: 'Levels...',
                    order: 1,
                    scaleMin: 0,
                    scaleMax: 5
                  }
                ]
              }
            ]
          }
        ]
      };

      const newVersion = {
        id: 'new-id',
        versionNumber: 2,
        status: 'DRAFT',
        areas: sourceVersion.areas
      };

      vi.mocked(prisma.questionnaireVersion.findUnique).mockResolvedValue(sourceVersion as any);
      vi.mocked(prisma.questionnaireVersion.aggregate).mockResolvedValue({
        _max: { versionNumber: 1 }
      } as any);
      vi.mocked(prisma.questionnaireVersion.create).mockResolvedValue(newVersion as any);

      const result = await cloneQuestionnaireVersion('source-id');

      expect(result.versionNumber).toBe(2);
      expect(result.status).toBe('DRAFT');
      expect(prisma.questionnaireVersion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            versionNumber: 2,
            status: 'DRAFT'
          })
        })
      );
    });

    it('should throw error if source version not found', async () => {
      vi.mocked(prisma.questionnaireVersion.findUnique).mockResolvedValue(null);

      await expect(cloneQuestionnaireVersion('invalid-id')).rejects.toThrow(
        'Source questionnaire version not found'
      );
    });

    it('should increment version number from zero if no versions exist', async () => {
      const sourceVersion = {
        id: 'source-id',
        versionNumber: 1,
        status: 'PUBLISHED',
        areas: []
      };

      vi.mocked(prisma.questionnaireVersion.findUnique).mockResolvedValue(sourceVersion as any);
      vi.mocked(prisma.questionnaireVersion.aggregate).mockResolvedValue({
        _max: { versionNumber: null }
      } as any);
      vi.mocked(prisma.questionnaireVersion.create).mockResolvedValue({
        id: 'new-id',
        versionNumber: 1,
        status: 'DRAFT',
        areas: []
      } as any);

      const result = await cloneQuestionnaireVersion('source-id');

      expect(result.versionNumber).toBe(1);
    });
  });

  describe('publishQuestionnaireVersion', () => {
    it('should publish a DRAFT version successfully', async () => {
      const draftVersion = {
        id: 'draft-id',
        versionNumber: 2,
        status: 'DRAFT'
      };

      const publishedVersion = {
        ...draftVersion,
        status: 'PUBLISHED',
        publishedAt: new Date()
      };

      vi.mocked(prisma.questionnaireVersion.findUnique).mockResolvedValue(draftVersion as any);
      vi.mocked(prisma.questionnaireVersion.updateMany).mockResolvedValue({ count: 1 } as any);
      vi.mocked(prisma.questionnaireVersion.update).mockResolvedValue(publishedVersion as any);

      const result = await publishQuestionnaireVersion('draft-id');

      expect(result.status).toBe('PUBLISHED');
      expect(prisma.questionnaireVersion.updateMany).toHaveBeenCalledWith({
        where: { status: 'PUBLISHED' },
        data: { status: 'ARCHIVED' }
      });
    });

    it('should throw error if version not found', async () => {
      vi.mocked(prisma.questionnaireVersion.findUnique).mockResolvedValue(null);

      await expect(publishQuestionnaireVersion('invalid-id')).rejects.toThrow(
        'Questionnaire version not found'
      );
    });

    it('should throw error if version is already published', async () => {
      const publishedVersion = {
        id: 'published-id',
        status: 'PUBLISHED'
      };

      vi.mocked(prisma.questionnaireVersion.findUnique).mockResolvedValue(publishedVersion as any);

      await expect(publishQuestionnaireVersion('published-id')).rejects.toThrow(
        'Version is already published'
      );
    });

    it('should throw error if version is archived', async () => {
      const archivedVersion = {
        id: 'archived-id',
        status: 'ARCHIVED'
      };

      vi.mocked(prisma.questionnaireVersion.findUnique).mockResolvedValue(archivedVersion as any);

      await expect(publishQuestionnaireVersion('archived-id')).rejects.toThrow(
        'Cannot publish an archived version'
      );
    });
  });

  describe('archiveQuestionnaireVersion', () => {
    it('should archive a version successfully', async () => {
      const version = {
        id: 'version-id',
        status: 'PUBLISHED',
        assessments: []
      };

      const archivedVersion = {
        ...version,
        status: 'ARCHIVED'
      };

      vi.mocked(prisma.questionnaireVersion.findUnique).mockResolvedValue(version as any);
      vi.mocked(prisma.questionnaireVersion.update).mockResolvedValue(archivedVersion as any);

      const result = await archiveQuestionnaireVersion('version-id');

      expect(result.status).toBe('ARCHIVED');
    });

    it('should throw error if version has active draft assessments', async () => {
      const version = {
        id: 'version-id',
        status: 'PUBLISHED',
        assessments: [{ id: 'assessment-1' }]
      };

      vi.mocked(prisma.questionnaireVersion.findUnique).mockResolvedValue(version as any);

      await expect(archiveQuestionnaireVersion('version-id')).rejects.toThrow(
        'Cannot archive version with active draft assessments'
      );
    });
  });

  describe('deleteQuestionnaireVersion', () => {
    it('should delete a DRAFT version with no assessments', async () => {
      const draftVersion = {
        id: 'draft-id',
        status: 'DRAFT',
        _count: { assessments: 0 }
      };

      vi.mocked(prisma.questionnaireVersion.findUnique).mockResolvedValue(draftVersion as any);
      vi.mocked(prisma.questionnaireVersion.delete).mockResolvedValue(draftVersion as any);

      const result = await deleteQuestionnaireVersion('draft-id');

      expect(result.success).toBe(true);
      expect(prisma.questionnaireVersion.delete).toHaveBeenCalledWith({
        where: { id: 'draft-id' }
      });
    });

    it('should throw error if version is not DRAFT', async () => {
      const publishedVersion = {
        id: 'published-id',
        status: 'PUBLISHED',
        _count: { assessments: 0 }
      };

      vi.mocked(prisma.questionnaireVersion.findUnique).mockResolvedValue(publishedVersion as any);

      await expect(deleteQuestionnaireVersion('published-id')).rejects.toThrow(
        'Only DRAFT versions can be deleted'
      );
    });

    it('should throw error if version has assessments', async () => {
      const draftVersion = {
        id: 'draft-id',
        status: 'DRAFT',
        _count: { assessments: 5 }
      };

      vi.mocked(prisma.questionnaireVersion.findUnique).mockResolvedValue(draftVersion as any);

      await expect(deleteQuestionnaireVersion('draft-id')).rejects.toThrow(
        'Cannot delete version with assessments'
      );
    });
  });

  describe('updateArea', () => {
    it('should update area for DRAFT version', async () => {
      const draftVersion = {
        id: 'version-id',
        status: 'DRAFT'
      };

      const updatedArea = {
        id: 'area-id',
        name: 'Updated Area',
        weight: 0.3
      };

      vi.mocked(prisma.questionnaireVersion.findUnique).mockResolvedValue(draftVersion as any);
      vi.mocked(prisma.area.update).mockResolvedValue(updatedArea as any);

      const result = await updateArea('version-id', 'area-id', { name: 'Updated Area', weight: 0.3 });

      expect(result.name).toBe('Updated Area');
      expect(prisma.area.update).toHaveBeenCalledWith({
        where: {
          id: 'area-id',
          questionnaireVersionId: 'version-id'
        },
        data: { name: 'Updated Area', weight: 0.3 }
      });
    });

    it('should throw error if version is not DRAFT', async () => {
      const publishedVersion = {
        id: 'version-id',
        status: 'PUBLISHED'
      };

      vi.mocked(prisma.questionnaireVersion.findUnique).mockResolvedValue(publishedVersion as any);

      await expect(updateArea('version-id', 'area-id', { name: 'Test' })).rejects.toThrow(
        'Cannot modify a published or archived version'
      );
    });
  });

  describe('updateElement', () => {
    it('should update element for DRAFT version', async () => {
      const draftVersion = {
        id: 'version-id',
        status: 'DRAFT'
      };

      const updatedElement = {
        id: 'element-id',
        name: 'Updated Element'
      };

      vi.mocked(prisma.questionnaireVersion.findUnique).mockResolvedValue(draftVersion as any);
      vi.mocked(prisma.element.update).mockResolvedValue(updatedElement as any);

      const result = await updateElement('version-id', 'element-id', { name: 'Updated Element' });

      expect(result.name).toBe('Updated Element');
    });
  });

  describe('updateQuestion', () => {
    it('should update question for DRAFT version', async () => {
      const draftVersion = {
        id: 'version-id',
        status: 'DRAFT'
      };

      const updatedQuestion = {
        id: 'question-id',
        questionText: 'Updated question?'
      };

      vi.mocked(prisma.questionnaireVersion.findUnique).mockResolvedValue(draftVersion as any);
      vi.mocked(prisma.question.update).mockResolvedValue(updatedQuestion as any);

      const result = await updateQuestion('version-id', 'question-id', { questionText: 'Updated question?' });

      expect(result.questionText).toBe('Updated question?');
    });
  });

  describe('validateAreaWeights', () => {
    it('should validate weights that sum to 1.0', async () => {
      const version = {
        id: 'version-id',
        areas: [
          { weight: 0.25 },
          { weight: 0.25 },
          { weight: 0.25 },
          { weight: 0.25 }
        ]
      };

      vi.mocked(prisma.questionnaireVersion.findUnique).mockResolvedValue(version as any);

      const result = await validateAreaWeights('version-id');

      expect(result.valid).toBe(true);
      expect(result.totalWeight).toBe(1.0);
    });

    it('should detect invalid weights that do not sum to 1.0', async () => {
      const version = {
        id: 'version-id',
        areas: [
          { weight: 0.3 },
          { weight: 0.3 },
          { weight: 0.3 }
        ]
      };

      vi.mocked(prisma.questionnaireVersion.findUnique).mockResolvedValue(version as any);

      const result = await validateAreaWeights('version-id');

      expect(result.valid).toBe(false);
      expect(result.totalWeight).toBeCloseTo(0.9, 10);
      expect(result.error).toContain('Total weight must equal 1.0');
    });

    it('should handle version not found', async () => {
      vi.mocked(prisma.questionnaireVersion.findUnique).mockResolvedValue(null);

      const result = await validateAreaWeights('invalid-id');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Version not found');
    });

    it('should handle floating point precision', async () => {
      const version = {
        id: 'version-id',
        areas: [
          { weight: 0.25 },
          { weight: 0.25 },
          { weight: 0.16 },
          { weight: 0.22 },
          { weight: 0.12 }
        ]
      };

      vi.mocked(prisma.questionnaireVersion.findUnique).mockResolvedValue(version as any);

      const result = await validateAreaWeights('version-id');

      expect(result.valid).toBe(true); // Should pass with small floating point error tolerance
    });
  });

  describe('getQuestionnaireVersion', () => {
    it('should retrieve a version with full structure', async () => {
      const version = {
        id: 'version-id',
        versionNumber: 1,
        status: 'PUBLISHED',
        areas: []
      };

      vi.mocked(prisma.questionnaireVersion.findUnique).mockResolvedValue(version as any);

      const result = await getQuestionnaireVersion('version-id');

      expect(result?.id).toBe('version-id');
    });

    it('should return null if version not found', async () => {
      vi.mocked(prisma.questionnaireVersion.findUnique).mockResolvedValue(null);

      const result = await getQuestionnaireVersion('invalid-id');

      expect(result).toBeNull();
    });
  });

  describe('getLatestPublishedVersion', () => {
    it('should retrieve the latest published version', async () => {
      const latestVersion = {
        id: 'latest-id',
        versionNumber: 3,
        status: 'PUBLISHED',
        areas: []
      };

      vi.mocked(prisma.questionnaireVersion.findFirst).mockResolvedValue(latestVersion as any);

      const result = await getLatestPublishedVersion();

      expect(result?.versionNumber).toBe(3);
      expect(prisma.questionnaireVersion.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'PUBLISHED' },
          orderBy: { versionNumber: 'desc' }
        })
      );
    });
  });

  describe('getAllQuestionnaireVersions', () => {
    it('should retrieve all versions ordered by version number', async () => {
      const versions = [
        { id: 'v3', versionNumber: 3, _count: { areas: 5, assessments: 10 } },
        { id: 'v2', versionNumber: 2, _count: { areas: 5, assessments: 5 } },
        { id: 'v1', versionNumber: 1, _count: { areas: 5, assessments: 0 } }
      ];

      vi.mocked(prisma.questionnaireVersion.findMany).mockResolvedValue(versions as any);

      const result = await getAllQuestionnaireVersions();

      expect(result).toHaveLength(3);
      expect(result[0].versionNumber).toBe(3);
    });
  });
});
