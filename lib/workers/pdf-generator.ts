import puppeteer from 'puppeteer';
import { prisma } from '@/lib/db';

interface CalculatedScores {
  totalScore: number;
  maturityLevel: string;
  areaScores: Record<string, {
    score: number;
    elementScores: Record<string, number>;
  }>;
}

export async function generatePDF(assessmentId: string): Promise<Buffer> {
  const assessment = await prisma.assessmentResponse.findUnique({
    where: { id: assessmentId },
    include: {
      questionnaireVersion: {
        include: {
          areas: {
            include: {
              elements: {
                include: {
                  questions: true
                }
              }
            },
            orderBy: { order: 'asc' }
          }
        }
      }
    }
  });

  if (!assessment) {
    throw new Error(`Assessment ${assessmentId} not found`);
  }

  if (!assessment.calculatedScores) {
    throw new Error(`Assessment ${assessmentId} has no calculated scores`);
  }

  const scores = assessment.calculatedScores as CalculatedScores;

  const html = generateHTMLReport(assessment, scores);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      },
      printBackground: true
    });

    return pdf;
  } finally {
    await browser.close();
  }
}

function generateHTMLReport(assessment: any, scores: CalculatedScores): string {
  const areaScoresHTML = Object.entries(scores.areaScores)
    .map(([areaCode, areaData]) => {
      const area = assessment.questionnaireVersion.areas.find((a: any) => a.code === areaCode);
      return `
        <div class="area-score">
          <h3>${area?.name || areaCode}</h3>
          <div class="score-value">${areaData.score.toFixed(1)}/5.0</div>
          <div class="elements">
            ${Object.entries(areaData.elementScores)
              .map(([elementCode, elementScore]) => {
                const element = area?.elements.find((e: any) => e.code === elementCode);
                return `
                  <div class="element-score">
                    <span class="element-name">${element?.name || elementCode}:</span>
                    <span class="element-value">${elementScore.toFixed(1)}/5.0</span>
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            padding: 20px;
          }

          .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
          }

          h1 {
            color: #1e40af;
            font-size: 32px;
            margin-bottom: 10px;
          }

          .meta-info {
            color: #666;
            font-size: 14px;
            margin-top: 10px;
          }

          .overall-score {
            background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            margin-bottom: 30px;
          }

          .score {
            font-size: 64px;
            font-weight: bold;
            margin: 10px 0;
          }

          .maturity-level {
            font-size: 24px;
            margin-top: 10px;
            text-transform: uppercase;
            letter-spacing: 2px;
          }

          .areas-section {
            margin-top: 30px;
          }

          .area-score {
            background: #f8fafc;
            border-left: 4px solid #2563eb;
            padding: 20px;
            margin-bottom: 20px;
            border-radius: 5px;
          }

          .area-score h3 {
            color: #1e40af;
            font-size: 20px;
            margin-bottom: 15px;
          }

          .score-value {
            font-size: 28px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 15px;
          }

          .elements {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .element-score {
            display: flex;
            justify-content: space-between;
            padding: 8px 12px;
            background: white;
            border-radius: 4px;
            font-size: 14px;
          }

          .element-name {
            color: #475569;
          }

          .element-value {
            font-weight: 600;
            color: #2563eb;
          }

          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e2e8f0;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>AI Maturity Assessment Report</h1>
          <div class="meta-info">
            <p><strong>User:</strong> ${assessment.userName || assessment.userEmail}</p>
            <p><strong>Submitted:</strong> ${assessment.submittedAt ? new Date(assessment.submittedAt).toLocaleString('it-IT') : 'N/A'}</p>
            <p><strong>Report Generated:</strong> ${new Date().toLocaleString('it-IT')}</p>
          </div>
        </div>

        <div class="overall-score">
          <div>Overall AI Maturity Score</div>
          <div class="score">${scores.totalScore.toFixed(1)}/5.0</div>
          <div class="maturity-level">Level: ${scores.maturityLevel}</div>
        </div>

        <div class="areas-section">
          <h2 style="color: #1e40af; margin-bottom: 20px;">Detailed Scores by Area</h2>
          ${areaScoresHTML}
        </div>

        <div class="footer">
          <p>© ${new Date().getFullYear()} AI Maturity Assessment Platform</p>
          <p>This report is confidential and intended solely for the recipient.</p>
        </div>
      </body>
    </html>
  `;
}
