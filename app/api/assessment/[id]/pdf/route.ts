import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generatePDF } from '@/lib/workers/pdf-generator';
import fs from 'fs/promises';
import path from 'path';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    console.log('📥 PDF request for assessment:', params.id);

    // Get assessment from database
    const assessment = await prisma.assessmentResponse.findUnique({
      where: { id: params.id }
    });

    if (!assessment) {
      console.log('❌ Assessment not found:', params.id);
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    // Check if assessment has been submitted
    if (assessment.status === 'DRAFT') {
      console.log('❌ Assessment not submitted yet:', params.id);
      return NextResponse.json({ error: 'Assessment not submitted yet' }, { status: 400 });
    }

    // Check if PDF already exists
    const pdfDir = path.join(process.cwd(), 'public', 'pdfs');
    const filename = `assessment-${params.id}.pdf`;
    const filepath = path.join(pdfDir, filename);

    let pdfBuffer: Buffer;

    try {
      // Try to read existing PDF
      pdfBuffer = await fs.readFile(filepath);
      console.log('✅ Serving existing PDF:', filename);
    } catch (error) {
      // PDF doesn't exist, generate it
      console.log('📄 PDF not found, generating new one...');

      if (!assessment.calculatedScores) {
        console.log('❌ Assessment has no calculated scores');
        return NextResponse.json({ error: 'Assessment has no scores' }, { status: 400 });
      }

      // Generate PDF
      pdfBuffer = await generatePDF(params.id);

      // Save PDF to disk for future requests
      await fs.mkdir(pdfDir, { recursive: true });
      await fs.writeFile(filepath, pdfBuffer);

      // Update database with PDF URL
      await prisma.assessmentResponse.update({
        where: { id: params.id },
        data: {
          pdfUrl: `/pdfs/${filename}`,
          pdfGeneratedAt: new Date(),
          status: assessment.status === 'SUBMITTED' ? 'PDF_GENERATED' : assessment.status
        }
      });

      console.log('✅ PDF generated and saved:', filename);
    }

    // Return PDF with proper headers
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="AI-Maturity-Report-${params.id}.pdf"`,
        'Cache-Control': 'public, max-age=3600'
      }
    });

  } catch (error) {
    console.error('❌ Error generating/serving PDF:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate PDF',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
