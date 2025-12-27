import { prisma } from '@/lib/db';
import { VersionStatus, Prisma } from '@prisma/client';

export interface QuestionnaireVersionWithDetails {
  id: string;
  versionNumber: number;
  status: VersionStatus;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  areas: Array<{
    id: string;
    code: string;
    name: string;
    description: string | null;
    weight: number;
    order: number;
    elements: Array<{
      id: string;
      code: string;
      name: string;
      description: string | null;
      weight: number;
      order: number;
      questions: Array<{
        id: string;
        code: string;
        questionText: string;
        levelsDescription: string;
        order: number;
        scaleMin: number;
        scaleMax: number;
      }>;
    }>;
  }>;
}

const includeFullStructure = {
  areas: {
    include: {
      elements: {
        include: {
          questions: {
            orderBy: {
              order: 'asc' as const
            }
          }
        },
        orderBy: {
          order: 'asc' as const
        }
      }
    },
    orderBy: {
      order: 'asc' as const
    }
  }
};

/**
 * Get all questionnaire versions
 */
export async function getAllQuestionnaireVersions() {
  return await prisma.questionnaireVersion.findMany({
    orderBy: { versionNumber: 'desc' },
    include: {
      _count: {
        select: {
          areas: true,
          assessments: true
        }
      }
    }
  });
}

/**
 * Get a specific questionnaire version with full structure
 */
export async function getQuestionnaireVersion(id: string): Promise<QuestionnaireVersionWithDetails | null> {
  return await prisma.questionnaireVersion.findUnique({
    where: { id },
    include: includeFullStructure
  }) as QuestionnaireVersionWithDetails | null;
}

/**
 * Get the latest published questionnaire version
 */
export async function getLatestPublishedVersion(): Promise<QuestionnaireVersionWithDetails | null> {
  return await prisma.questionnaireVersion.findFirst({
    where: { status: 'PUBLISHED' },
    orderBy: { versionNumber: 'desc' },
    include: includeFullStructure
  }) as QuestionnaireVersionWithDetails | null;
}

/**
 * Clone an existing questionnaire version
 * Creates a new DRAFT version with incremented version number
 */
export async function cloneQuestionnaireVersion(sourceId: string) {
  const source = await prisma.questionnaireVersion.findUnique({
    where: { id: sourceId },
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

  if (!source) {
    throw new Error('Source questionnaire version not found');
  }

  // Get the maximum version number to increment
  const maxVersion = await prisma.questionnaireVersion.aggregate({
    _max: { versionNumber: true }
  });

  const newVersionNumber = (maxVersion._max.versionNumber || 0) + 1;

  // Create new version with deep clone of structure
  return await prisma.questionnaireVersion.create({
    data: {
      versionNumber: newVersionNumber,
      status: 'DRAFT',
      areas: {
        create: source.areas.map(area => ({
          code: area.code,
          name: area.name,
          description: area.description,
          weight: area.weight,
          order: area.order,
          elements: {
            create: area.elements.map(elem => ({
              code: elem.code,
              name: elem.name,
              description: elem.description,
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
    include: includeFullStructure
  });
}

/**
 * Publish a questionnaire version
 * Makes it immutable and available for assessments
 * Archives any previously published versions
 */
export async function publishQuestionnaireVersion(id: string) {
  const version = await prisma.questionnaireVersion.findUnique({
    where: { id }
  });

  if (!version) {
    throw new Error('Questionnaire version not found');
  }

  if (version.status === 'PUBLISHED') {
    throw new Error('Version is already published');
  }

  if (version.status === 'ARCHIVED') {
    throw new Error('Cannot publish an archived version');
  }

  // Archive all currently published versions
  await prisma.questionnaireVersion.updateMany({
    where: { status: 'PUBLISHED' },
    data: { status: 'ARCHIVED' }
  });

  // Publish the new version
  return await prisma.questionnaireVersion.update({
    where: { id },
    data: {
      status: 'PUBLISHED',
      publishedAt: new Date()
    },
    include: includeFullStructure
  });
}

/**
 * Archive a questionnaire version
 */
export async function archiveQuestionnaireVersion(id: string) {
  const version = await prisma.questionnaireVersion.findUnique({
    where: { id },
    include: {
      assessments: {
        where: {
          status: 'DRAFT'
        },
        select: { id: true }
      }
    }
  });

  if (!version) {
    throw new Error('Questionnaire version not found');
  }

  // Check if there are active draft assessments using this version
  if (version.assessments.length > 0) {
    throw new Error('Cannot archive version with active draft assessments');
  }

  return await prisma.questionnaireVersion.update({
    where: { id },
    data: { status: 'ARCHIVED' }
  });
}

/**
 * Delete a questionnaire version
 * Only allowed for DRAFT versions with no assessments
 */
export async function deleteQuestionnaireVersion(id: string) {
  const version = await prisma.questionnaireVersion.findUnique({
    where: { id },
    include: {
      _count: {
        select: { assessments: true }
      }
    }
  });

  if (!version) {
    throw new Error('Questionnaire version not found');
  }

  if (version.status !== 'DRAFT') {
    throw new Error('Only DRAFT versions can be deleted');
  }

  if (version._count.assessments > 0) {
    throw new Error('Cannot delete version with assessments');
  }

  await prisma.questionnaireVersion.delete({
    where: { id }
  });

  return { success: true };
}

/**
 * Update area details
 * Only allowed for DRAFT versions
 */
export async function updateArea(
  versionId: string,
  areaId: string,
  data: {
    name?: string;
    description?: string;
    weight?: number;
    order?: number;
  }
) {
  const version = await prisma.questionnaireVersion.findUnique({
    where: { id: versionId }
  });

  if (!version) {
    throw new Error('Questionnaire version not found');
  }

  if (version.status !== 'DRAFT') {
    throw new Error('Cannot modify a published or archived version');
  }

  return await prisma.area.update({
    where: {
      id: areaId,
      questionnaireVersionId: versionId
    },
    data
  });
}

/**
 * Update element details
 * Only allowed for DRAFT versions
 */
export async function updateElement(
  versionId: string,
  elementId: string,
  data: {
    name?: string;
    description?: string;
    weight?: number;
    order?: number;
  }
) {
  const version = await prisma.questionnaireVersion.findUnique({
    where: { id: versionId }
  });

  if (!version) {
    throw new Error('Questionnaire version not found');
  }

  if (version.status !== 'DRAFT') {
    throw new Error('Cannot modify a published or archived version');
  }

  return await prisma.element.update({
    where: { id: elementId },
    data
  });
}

/**
 * Update question details
 * Only allowed for DRAFT versions
 */
export async function updateQuestion(
  versionId: string,
  questionId: string,
  data: {
    questionText?: string;
    levelsDescription?: string;
    order?: number;
    scaleMin?: number;
    scaleMax?: number;
  }
) {
  const version = await prisma.questionnaireVersion.findUnique({
    where: { id: versionId }
  });

  if (!version) {
    throw new Error('Questionnaire version not found');
  }

  if (version.status !== 'DRAFT') {
    throw new Error('Cannot modify a published or archived version');
  }

  return await prisma.question.update({
    where: { id: questionId },
    data
  });
}

/**
 * Validate weight distribution across areas
 */
export async function validateAreaWeights(versionId: string): Promise<{ valid: boolean; totalWeight: number; error?: string }> {
  const version = await prisma.questionnaireVersion.findUnique({
    where: { id: versionId },
    include: {
      areas: {
        select: { weight: true }
      }
    }
  });

  if (!version) {
    return { valid: false, totalWeight: 0, error: 'Version not found' };
  }

  const totalWeight = version.areas.reduce((sum, area) => sum + area.weight, 0);
  const valid = Math.abs(totalWeight - 1.0) < 0.001; // Allow small floating point errors

  return {
    valid,
    totalWeight,
    error: valid ? undefined : `Total weight must equal 1.0 (100%), current: ${totalWeight}`
  };
}
