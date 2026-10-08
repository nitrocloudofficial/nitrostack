import { PDFParse } from 'pdf-parse';
import { parse as parseCsvSync } from 'csv-parse/sync';
import type { TeamMember } from '../domain/schemas.js';

export async function extractTextFromSrdUpload(
  fileContentBase64?: string,
  fileType?: string,
  rawText?: string
): Promise<string> {
  if (rawText && rawText.trim().length > 0) {
    return rawText.trim();
  }

  if (!fileContentBase64) {
    throw new Error('Either srd_text or file_content (base64) must be provided.');
  }

  const buffer = Buffer.from(fileContentBase64, 'base64');

  if (fileType === 'application/pdf' || fileType?.endsWith('pdf')) {
    const parser = new PDFParse({ data: buffer });
    const textResult = await parser.getText();
    await parser.destroy();
    return textResult.text || '';
  }

  return buffer.toString('utf-8');
}

export function parseTeamRosterCsv(fileContentBase64: string): TeamMember[] {
  const csvText = Buffer.from(fileContentBase64, 'base64').toString('utf-8');
  const records = parseCsvSync(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  return records.map((r) => ({
    name: r.name || r.Name || 'Unknown Member',
    skills: (r.skills || r.Skills || '')
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean),
    experience_years: parseFloat(r.experience_years || r.Experience || '0') || 0,
    preferred_role: r.preferred_role || r.Role || undefined,
    working_hours_per_day: parseFloat(r.working_hours_per_day || r.Hours || '8') || 8,
  }));
}
