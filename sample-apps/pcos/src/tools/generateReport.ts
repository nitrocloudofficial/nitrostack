import path from 'path';
import { ToolDecorator as Tool, z } from '@nitrostack/core';
import { ensureDirectory, createPdfReport } from '../utils/pdf.js';

const REPORT_DIR = path.join(process.cwd(), 'data', 'generated_reports');

export class GenerateReportTool {
  @Tool({
    name: 'generateReport',
    description: 'Generate a professional PDF report from PCOS analysis results',
    inputSchema: z.object({
      lab_values: z.record(z.string(), z.number().nullable()),
      analysis: z.object({
        summary: z.string(),
        matched_trends: z.array(z.any()),
        explanations: z.array(z.string()),
        diet_recommendation: z.any(),
        exercise_recommendation: z.any(),
        confidence_score: z.number()
      }),
      report_title: z.string().optional()
    })
  })
  async generateReport(input: any) {
    await ensureDirectory(REPORT_DIR);

    const fileName = `femmon-report-${Date.now()}.pdf`;
    const outputPath = path.join(REPORT_DIR, fileName);

    await createPdfReport(outputPath, {
      title: input.report_title || 'Femmon Clinical Summary',
      labValues: input.lab_values,
      analysis: input.analysis,
      generatedAt: new Date().toISOString()
    });

    return {
      status: 'success',
      file_name: fileName,
      report_path: path.relative(process.cwd(), outputPath)
    };
  }
}
