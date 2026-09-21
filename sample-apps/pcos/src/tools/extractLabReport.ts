import fs from 'fs/promises';
import path from 'path';
import { ToolDecorator as Tool, z } from '@nitrostack/core';
import * as pdfParse from 'pdf-parse';
import { ensureDirectory } from '../utils/pdf.js';

const UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads');

function extractValue(text: string, label: RegExp): number | null {
  const match = text.match(label);
  if (!match || !match[1]) {
    return null;
  }

  const value = Number(match[1].replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}

export class ExtractLabReportTool {
  @Tool({
    name: 'extractLabReport',
    description: 'Extract medically relevant hormone values from an uploaded PDF report',
    inputSchema: z.object({
      file_name: z.string().describe('Name of the uploaded PDF file'),
      file_type: z.string().describe('MIME type of the uploaded PDF file'),
      file_content: z.string().describe('Base64-encoded PDF content')
    })
  })
  async extractLabReport(input: any) {
    await ensureDirectory(UPLOAD_DIR);

    const base64 = input.file_content.replace(/^data:.*;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');
    const filePath = path.join(UPLOAD_DIR, input.file_name);
    await fs.writeFile(filePath, buffer);

    const data = await (pdfParse as any)(buffer);
    const text = (data.text as string) ?? '';

    const labValues = {
      LH: extractValue(text, /LH\s*[:\-]?\s*([0-9]+\.?[0-9]*)/i),
      FSH: extractValue(text, /FSH\s*[:\-]?\s*([0-9]+\.?[0-9]*)/i),
      TSH: extractValue(text, /TSH\s*[:\-]?\s*([0-9]+\.?[0-9]*)/i),
      VitaminD: extractValue(text, /Vitamin\s*D\s*[:\-]?\s*([0-9]+\.?[0-9]*)/i),
      Insulin: extractValue(text, /Insulin\s*[:\-]?\s*([0-9]+\.?[0-9]*)/i),
      HbA1c: extractValue(text, /HbA1c\s*[:\-]?\s*([0-9]+\.?[0-9]*)/i),
      Testosterone: extractValue(text, /Testosterone\s*[:\-]?\s*([0-9]+\.?[0-9]*)/i)
    };

    return {
      status: 'success',
      file_name: input.file_name,
      temporary_file: filePath,
      lab_values: labValues
    };
  }
}
