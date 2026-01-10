import { renderToBuffer } from '@react-pdf/renderer';
import { prisma } from '@/lib/db';
import { AssessmentPDF, AssessmentPDFData } from '@/lib/pdf/AssessmentPDF';
import { TotalScore } from '@/lib/scoring/formulas';

export async function generatePDF(assessmentId: string): Promise<Buffer> {
  const assessment = await prisma.assessmentResponse.findUnique({
    where: { id: assessmentId },
    select: {
      id: true,
      userName: true,
      userEmail: true,
      submittedAt: true,
      calculatedScores: true
    }
  });

  if (!assessment) {
    throw new Error(`Assessment ${assessmentId} not found`);
  }

  if (!assessment.calculatedScores) {
    throw new Error(`Assessment ${assessmentId} has no calculated scores`);
  }

  const scores = assessment.calculatedScores as unknown as TotalScore;

  const pdfData: AssessmentPDFData = {
    userName: assessment.userName,
    userEmail: assessment.userEmail,
    submittedAt: assessment.submittedAt,
    scores
  };

  const pdfBuffer = await renderToBuffer(<AssessmentPDF data={pdfData} />);

  return Buffer.from(pdfBuffer);
}
