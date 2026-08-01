/**
 * ReportAI
 *
 * Single responsibility: medical report summarization, lab report
 * analysis, and trend analysis across a timeline of lab entries.
 *
 * Same hard constraints as MedicineAI: no database, no file, no auth
 * access, never calls another agent, and only sees data the AI Gateway
 * already sanitized.
 */

import type { IAIAgent } from '../interfaces/gateway.interfaces.js';
import type { AITaskName } from '../types/gateway.types.js';

export interface LabEntryInput {
  test: string;
  value: number;
  unit: string;
  referenceRange: string;
  status: 'normal' | 'above_range' | 'below_range' | 'critical' | 'unknown';
  date: string;
}

export interface ReportSummaryInput {
  /** Freeform report text, already stripped of name/contact/insurance fields upstream. */
  reportText?: string;
  /** Structured lab history for trend analysis, if available. */
  labHistory?: LabEntryInput[];
}

export interface ReportSummaryOutput {
  summary: string;
  abnormalFindings: Array<{ test: string; status: string; note: string }>;
  trends: Array<{ test: string; direction: 'improving' | 'worsening' | 'stable'; note: string }>;
}

export class ReportAI implements IAIAgent<ReportSummaryInput, ReportSummaryOutput> {
  readonly name = 'ReportAI';
  readonly handles: AITaskName[] = ['report-summary'];

  async run(input: ReportSummaryInput): Promise<ReportSummaryOutput> {
    const abnormalFindings = (input.labHistory ?? [])
      .filter(entry => entry.status !== 'normal')
      .map(entry => ({
        test: entry.test,
        status: entry.status,
        note: `${entry.test} is ${entry.status.replace('_', ' ')} (${entry.value} ${entry.unit}, reference ${entry.referenceRange}).`
      }));

    const trends = this.computeTrends(input.labHistory ?? []);

    const summary = this.buildSummary(input.reportText, abnormalFindings.length, trends);

    return { summary, abnormalFindings, trends };
  }

  private computeTrends(history: LabEntryInput[]): ReportSummaryOutput['trends'] {
    const byTest = new Map<string, LabEntryInput[]>();
    for (const entry of history) {
      const list = byTest.get(entry.test) ?? [];
      list.push(entry);
      byTest.set(entry.test, list);
    }

    const trends: ReportSummaryOutput['trends'] = [];
    for (const [test, entries] of byTest.entries()) {
      if (entries.length < 2) continue;
      const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const delta = last.value - first.value;

      let direction: 'improving' | 'worsening' | 'stable' = 'stable';
      if (Math.abs(delta) > 0.0001) {
        // Simple heuristic: moving toward "normal" status counts as improving.
        if (last.status === 'normal' && first.status !== 'normal') direction = 'improving';
        else if (last.status !== 'normal' && first.status === 'normal') direction = 'worsening';
        else direction = delta > 0 ? 'worsening' : 'improving';
      }

      trends.push({
        test,
        direction,
        note: `${test} moved from ${first.value}${first.unit} (${first.date}) to ${last.value}${last.unit} (${last.date}).`
      });
    }
    return trends;
  }

  private buildSummary(reportText: string | undefined, abnormalCount: number, trends: ReportSummaryOutput['trends']): string {
    const parts: string[] = [];
    if (reportText) {
      const wordCount = reportText.trim().split(/\s+/).length;
      parts.push(`Report processed (${wordCount} words).`);
    }
    parts.push(
      abnormalCount === 0
        ? 'No abnormal lab findings detected in the provided data.'
        : `${abnormalCount} abnormal finding(s) detected — see abnormalFindings for details.`
    );
    if (trends.length > 0) {
      const worsening = trends.filter(t => t.direction === 'worsening').length;
      parts.push(
        worsening > 0
          ? `${worsening} metric(s) trending in the wrong direction — recommend clinical follow-up.`
          : 'Tracked metrics are stable or improving.'
      );
    }
    return parts.join(' ');
  }
}
