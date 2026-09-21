import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

type ReportInput = {
  title: string;
  labValues: Record<string, number | null>;
  analysis: {
    summary: string;
    matched_trends: any[];
    explanations: string[];
    diet_recommendation: { title: string; summary: string; focus: string };
    exercise_recommendation: { title: string; summary: string; focus: string };
    confidence_score: number;
  };
  generatedAt: string;
};

export async function ensureDirectory(directory: string) {
  if (!fsSync.existsSync(directory)) {
    await fs.mkdir(directory, { recursive: true });
  }
}

export async function createPdfReport(outputPath: string, report: ReportInput) {
  await ensureDirectory(path.dirname(outputPath));

  return new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const writeStream = fsSync.createWriteStream(outputPath);

    doc.pipe(writeStream);

    doc.fontSize(18).text(report.title, { underline: true });
    doc.moveDown();

    doc.fontSize(10).text(`Generated: ${new Date(report.generatedAt).toLocaleString()}`);
    doc.moveDown();

    doc.fontSize(12).text('Summary', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).text(report.analysis.summary);
    doc.moveDown();

    doc.fontSize(12).text('Extracted Lab Values', { underline: true });
    doc.moveDown(0.5);
    Object.entries(report.labValues).forEach(([key, value]) => {
      doc.fontSize(10).text(`${key}: ${value !== null ? value : 'Not available'}`);
    });
    doc.moveDown();

    doc.fontSize(12).text('Matched Trends', { underline: true });
    doc.moveDown(0.5);
    if (report.analysis.matched_trends.length) {
      report.analysis.matched_trends.forEach((trend, index) => {
        doc.fontSize(10).text(`${index + 1}. Score: ${trend.score}%`);
        doc.fontSize(10).text(`   Data: ${JSON.stringify(trend.pattern || trend)}`);
      });
    } else {
      doc.fontSize(10).text('No similar menstrual patterns were matched.');
    }
    doc.moveDown();

    doc.fontSize(12).text('Clinical Explanations', { underline: true });
    doc.moveDown(0.5);
    report.analysis.explanations.forEach((explanation, index) => {
      doc.fontSize(10).text(`${index + 1}. ${explanation}`);
    });
    doc.moveDown();

    doc.fontSize(12).text('Diet Recommendation', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).text(report.analysis.diet_recommendation.title);
    doc.fontSize(10).text(report.analysis.diet_recommendation.summary);
    doc.moveDown();

    doc.fontSize(12).text('Exercise Recommendation', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).text(report.analysis.exercise_recommendation.title);
    doc.fontSize(10).text(report.analysis.exercise_recommendation.summary);
    doc.moveDown();

    doc.fontSize(12).text('Confidence Score', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`${report.analysis.confidence_score}%`);
    doc.moveDown();

    doc.fontSize(8).text('Disclaimer: This report is clinical decision-support only and is not a medical diagnosis.');

    doc.end();

    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });
}
