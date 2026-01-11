import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generatePDF } from '@/lib/workers/pdf-generator';

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

    if (!assessment.calculatedScores) {
      console.log('❌ Assessment has no calculated scores');
      return NextResponse.json({ error: 'Assessment has no scores' }, { status: 400 });
    }

    // Generate PDF in memory (no filesystem access needed)
    console.log('📄 Generating PDF...');
    const pdfBuffer = await generatePDF(params.id);
    console.log('✅ PDF generated successfully');

    // Update database status if needed (non-blocking)
    if (assessment.status === 'SUBMITTED') {
      prisma.assessmentResponse.update({
        where: { id: params.id },
        data: {
          pdfGeneratedAt: new Date(),
          status: 'PDF_GENERATED'
        }
      }).catch(err => console.error('Failed to update status:', err));
    }

    // Return PDF directly from memory
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="AI-Maturity-Report-${params.id}.pdf"`,
        'Cache-Control': 'public, max-age=3600'
      }
    });

  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate PDF',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
