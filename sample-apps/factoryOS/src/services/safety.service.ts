import { Injectable } from '@nitrostack/core';
import { DbService } from './db.service.js';

export interface TimelineEvent {
  timestamp: string;
  description: string;
}

@Injectable({ deps: [DbService] })
export class SafetyService {
  constructor(private db: DbService) {}

  async getIncident(incidentId: string) {
    const row = await this.db.get<any>(`SELECT * FROM safety_incidents WHERE incident_id = ?`, [incidentId]);
    if (!row) {
      throw new Error(`Safety incident ${incidentId} not found in database.`);
    }
    return row;
  }

  async generateSafetyReport(incidentId: string) {
    const incident = await this.getIncident(incidentId);

    // Generate formatted markdown report matching OSHA requirements
    const reportMarkdown = `
# OSHA-COMPLIANT INCIDENT SAFETY REPORT
**Incident ID**: ${incident.incident_id}  
**Reported At**: ${incident.reported_at}  
**Location**: ${incident.location}  
**Severity**: ${incident.severity}  

## Description of Hazard/Incident
${incident.description}

## Action Plan & EHS Mitigations
1. **Immediate Action**: Containment of the area. Relevant machinery placed in immediate safety hold/downtime.
2. **Lockout/Tagout (LOTO)**: Applied to all affected systems.
3. **Engineering Assessment**: Maintenance dispatched to inspect mechanical/structural alignment.
4. **Resolution Schedule**: Verification of mechanical integrity before returning to production.

---
*FactoryOS EHS Compliance Division*
`;

    // Save report in the database
    await this.db.run(
      `UPDATE safety_incidents SET safety_report = ?, status = 'REPORTED' WHERE incident_id = ?`,
      [reportMarkdown, incidentId]
    );

    return {
      incidentId,
      status: 'REPORTED',
      reportedAt: incident.reported_at,
      oshaComplianceFlagged: incident.severity === 'HIGH' || incident.severity === 'CRITICAL' ? 1 : 0,
      reportMarkdown
    };
  }

  async createIncidentTimeline(incidentId: string, events: TimelineEvent[]) {
    // Check if incident exists
    await this.getIncident(incidentId);

    const timelineJson = JSON.stringify(events);

    await this.db.run(
      `UPDATE safety_incidents SET timeline = ? WHERE incident_id = ?`,
      [timelineJson, incidentId]
    );

    return {
      incidentId,
      status: 'TIMELINE_LOGGED',
      eventsCount: events.length,
      timeline: events
    };
  }
}
