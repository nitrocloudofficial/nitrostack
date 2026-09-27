// A deliberately simple JSON-file "database". No native modules, no
// external DB server to install — just reliable persisted state for a
// hackathon demo. Swap this module for a real DB client later; nothing
// outside `db/` should need to change since routes only ever call the
// exported `store` methods below.

import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from '../config';
import type { CaseData, DocumentRecord, IssueReport, TimelineEvent } from '../types';

type InternalCaseRecord = CaseData & {
  /** Not part of the public CaseData contract — kept server-side only. */
  patientHistory?: string;
};

type CasesFile = Record<string, InternalCaseRecord>;
type DocumentsFile = Record<string, DocumentRecord[]>;
type IssuesFile = IssueReport[];

const CASES_PATH = path.join(DATA_DIR, 'cases.json');
const DOCUMENTS_PATH = path.join(DATA_DIR, 'documents.json');
const ISSUES_PATH = path.join(DATA_DIR, 'issues.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson<T>(filePath: string, fallback: T): T {
  ensureDataDir();
  if (!fs.existsSync(filePath)) return fallback;
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return raw.trim() ? (JSON.parse(raw) as T) : fallback;
  } catch {
    // A corrupted file shouldn't take the whole server down for a demo.
    return fallback;
  }
}

function writeJson<T>(filePath: string, data: T) {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

class Store {
  private cases: CasesFile;
  private documents: DocumentsFile;
  private issues: IssuesFile;

  constructor() {
    this.cases = readJson<CasesFile>(CASES_PATH, {});
    this.documents = readJson<DocumentsFile>(DOCUMENTS_PATH, {});
    this.issues = readJson<IssuesFile>(ISSUES_PATH, []);
  }

  private persistCases() {
    writeJson(CASES_PATH, this.cases);
  }

  private persistDocuments() {
    writeJson(DOCUMENTS_PATH, this.documents);
  }

  private persistIssues() {
    writeJson(ISSUES_PATH, this.issues);
  }

  private toPublic(record: InternalCaseRecord): CaseData {
    const { patientHistory: _patientHistory, ...publicCase } = record;
    return publicCase;
  }

  // --- Cases ---

  listCases(): CaseData[] {
    return Object.values(this.cases)
      .map((c) => this.toPublic(c))
      .sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));
  }

  getCase(caseId: string): CaseData | undefined {
    const record = this.cases[caseId];
    return record ? this.toPublic(record) : undefined;
  }

  /** Full internal record, including server-only fields like patientHistory. */
  getInternalCase(caseId: string): InternalCaseRecord | undefined {
    return this.cases[caseId];
  }

  /** Seeds a case only if that id doesn't already exist (used at startup). */
  seedIfMissing(record: InternalCaseRecord) {
    if (this.cases[record.caseId]) return;
    this.cases[record.caseId] = record;
    this.persistCases();
  }

  createCase(record: InternalCaseRecord): CaseData {
    this.cases[record.caseId] = record;
    this.persistCases();
    return this.toPublic(record);
  }

  updateCase(
    caseId: string,
    updater: (current: InternalCaseRecord) => InternalCaseRecord
  ): CaseData | undefined {
    const current = this.cases[caseId];
    if (!current) return undefined;
    const next = updater(current);
    this.cases[caseId] = next;
    this.persistCases();
    return this.toPublic(next);
  }

  appendTimelineEvent(caseId: string, event: TimelineEvent): CaseData | undefined {
    return this.updateCase(caseId, (current) => ({
      ...current,
      timeline: [...current.timeline, event],
    }));
  }

  caseExists(caseId: string): boolean {
    return Boolean(this.cases[caseId]);
  }

  // --- Documents ---

  listDocuments(caseId: string): DocumentRecord[] {
    return this.documents[caseId] ?? [];
  }

  addDocument(caseId: string, doc: DocumentRecord): DocumentRecord[] {
    const existing = this.documents[caseId] ?? [];
    // One upload per documentId — replace rather than duplicate.
    const next = [...existing.filter((d) => d.documentId !== doc.documentId), doc];
    this.documents[caseId] = next;
    this.persistDocuments();
    return next;
  }

  // --- Issues ---

  listIssues(caseId: string): IssueReport[] {
    return this.issues.filter((i) => i.caseId === caseId);
  }

  addIssue(issue: IssueReport): IssueReport {
    this.issues.push(issue);
    this.persistIssues();
    return issue;
  }
}

export const store = new Store();
export type { InternalCaseRecord };
