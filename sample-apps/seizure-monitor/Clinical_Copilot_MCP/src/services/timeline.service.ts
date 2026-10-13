import { Injectable } from '@nitrostack/core';
import { TimelineEvent } from '../schemas/timeline.schema.js';

/**
 * Clinical Copilot MCP Server - Timeline Service
 *
 * Implements business logic for converting raw processed medical reports into
 * chronologically sorted, deduplicated clinical event timelines.
 *
 * CRITICAL RULE: Always uses extracted reportDate (YYYY-MM-DD), NEVER uploadedAt.
 */
@Injectable()
export class TimelineService {
  /**
   * Generates a chronologically sorted and merged clinical event timeline.
   */
  generateTimelineFromReports(reports: any[]): TimelineEvent[] {
    const rawEvents: TimelineEvent[] = [];

    for (const report of reports) {
      // 1. Extract reportDate - NEVER use uploadedAt
      const extractedJson = report.extractedJson || {};
      const reportDate =
        extractedJson.reportDate ||
        report.reportDate ||
        new Date().toISOString().split('T')[0];

      const reportType = extractedJson.reportType || report.reportType || 'Medical Report';
      const doctor = extractedJson.doctor || report.doctor || '';
      const hospital = extractedJson.hospital || report.hospital || '';

      // 2. Extract Event Title & Description based on Report Type & JSON
      const { title, description } = this.deriveEventTitleAndDescription(reportType, extractedJson, report);

      const eventId = `evt_${report.reportId || Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

      rawEvents.push({
        eventId,
        date: reportDate,
        title,
        description,
        reportId: report.reportId || 'REP_UNKNOWN',
        reportType,
        doctor,
        hospital,
      });
    }

    // 3. Deduplicate & Merge duplicate events on same date & title
    const mergedEvents = this.mergeDuplicateEvents(rawEvents);

    // 4. Sort Chronologically (Oldest -> Newest) by reportDate
    return this.sortEventsChronologically(mergedEvents);
  }

  /**
   * Derives human-readable event title and description from report type & extracted clinical data
   */
  private deriveEventTitleAndDescription(
    reportType: string,
    json: Record<string, any>,
    report: any
  ): { title: string; description: string } {
    const typeLower = reportType.toLowerCase();
    const disease = json.disease || json.diagnosis || '';

    if (typeLower.includes('blood') || typeLower.includes('lab')) {
      const labs = json.labValues
        ? Object.entries(json.labValues)
            .map(([k, v]) => `${k} ${v}`)
            .join(', ')
        : 'Blood test completed';
      return {
        title: 'Blood Test',
        description: labs || 'Routine lab panel completed.',
      };
    }

    if (typeLower.includes('mri') || typeLower.includes('radiology') || typeLower.includes('scan')) {
      return {
        title: 'MRI Scan',
        description: json.summary || 'Diagnostic radiology imaging completed.',
      };
    }

    if (typeLower.includes('prescription') || typeLower.includes('medication')) {
      const meds = Array.isArray(json.medications) ? json.medications.join(', ') : 'Medication prescribed';
      return {
        title: meds ? `Started ${meds.split(',')[0]}` : 'Medication Started',
        description: meds ? `Medications prescribed: ${meds}.` : 'Prescription updated.',
      };
    }

    if (typeLower.includes('discharge') || typeLower.includes('admission') || typeLower.includes('hospital')) {
      const detail = json.summary || json.diagnosis || (disease ? `Admitted for ${disease}` : `Admitted to ${json.hospital || 'Hospital'}.`);
      return {
        title: 'Hospital Admission',
        description: detail,
      };
    }

    if (typeLower.includes('diagnosis') || disease) {
      return {
        title: `Diagnosed with ${disease || 'Condition'}`,
        description: json.summary || json.diagnosis || 'Diagnosis confirmed.',
      };
    }

    return {
      title: `${reportType} Event`,
      description: json.summary || json.diagnosis || 'Medical record recorded.',
    };
  }

  /**
   * Merges duplicate events on the same date with matching title or reportType
   */
  private mergeDuplicateEvents(events: TimelineEvent[]): TimelineEvent[] {
    const eventMap = new Map<string, TimelineEvent>();

    for (const evt of events) {
      // Key by date and lowercased title to detect duplicates
      const key = `${evt.date}_${evt.title.toLowerCase().trim()}`;

      if (eventMap.has(key)) {
        const existing = eventMap.get(key)!;
        // Merge descriptions if distinct
        if (!existing.description.includes(evt.description)) {
          existing.description = `${existing.description}; ${evt.description}`;
        }
        if (!existing.doctor && evt.doctor) {
          existing.doctor = evt.doctor;
        }
        if (!existing.hospital && evt.hospital) {
          existing.hospital = evt.hospital;
        }
      } else {
        eventMap.set(key, { ...evt });
      }
    }

    return Array.from(eventMap.values());
  }

  /**
   * Sorts timeline events chronologically (Oldest -> Newest) by reportDate
   */
  private sortEventsChronologically(events: TimelineEvent[]): TimelineEvent[] {
    return [...events].sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      return timeA - timeB; // Ascending order: Oldest to Newest
    });
  }
}
