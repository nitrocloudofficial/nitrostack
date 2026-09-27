import { readFileSync } from 'fs';
import { join } from 'path';

export interface LawEntry {
  id: string;
  title: string;
  text: string;
  summary: string;
  tags: string[];
  jurisdiction: string;
  part?: string;
  chapter?: string;
  code?: string;
  section?: string;
}

export interface ProcedureStep {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  jurisdiction: string;
}

export function loadJson<T>(filename: string): T {
  const filePath = join(process.cwd(), 'src', 'data', filename);
  const raw = readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

export const CONSTITUTION = loadJson<LawEntry[]>('constitution.json');
export const LABOUR_CODES = loadJson<LawEntry[]>('labour-codes.json');
export const PROCEDURES = loadJson<ProcedureStep[]>('procedures.json');
