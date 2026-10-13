import { IncidentSeverity, IncidentStatus } from '../types/index.js';

export interface McpToolResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface IncidentReport {
  incidentId: string;
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  startTime: string;
  rootCause: string;
  recommendations: string[];
}
