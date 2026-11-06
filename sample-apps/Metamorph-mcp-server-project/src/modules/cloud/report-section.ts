// Maps an inventory result to rows the report module can render later (wiring happens in a separate task).
import type { ReportFinding } from '../report/report-data.js';
import type { InventoryResult, NotChecked } from './inventory.js';

export interface CloudReportSection {
  heading: string;
  summary: string;
  findings: ReportFinding[];
  notChecked: NotChecked[];
  note: string;
}

export function cloudReportSection(r: InventoryResult): CloudReportSection {
  const counts = Object.entries(r.counts).map(([k, v]) => `${v} ${k}`).join(', ') || 'no resources';
  return {
    heading: `AWS account ${r.account}`,
    summary: `Scanned ${r.regions.join(', ')} (${counts}); ${r.findingsTotal} finding(s).`,
    findings: r.findings.map((f) => ({
      id: f.id,
      category: f.category,
      severity: f.severity,
      title: f.title,
      evidence: f.evidence,
      recommendation: f.recommendation,
      cwe: [],
      owasp: [],
      kev: false,
      rankReason: f.rankReason ?? `severity ${f.severity}`,
      source: f.source
    })),
    notChecked: r.notChecked,
    note: r.note
  };
}
