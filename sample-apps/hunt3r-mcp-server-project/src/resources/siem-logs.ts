import { readFile } from 'fs/promises';

export interface SIEMEvent {
  event_id: string;
  timestamp: string;
  host_id: string;
  event_type: string;
  user: string;
  process_name?: string;
  command_line?: string;
  parent_process?: string;
  query?: string;
  response?: string;
  destination_ip?: string;
  destination_port?: number;
  mitre_technique?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  raw_event: Record<string, any>;
}

export class SIEMLogsResource {
  private logs: SIEMEvent[] = [];
  
  async loadFromMock(path: string | URL = new URL('../../mock-data/siem-logs-temporal.json', import.meta.url)) {
    const data = JSON.parse(await readFile(path, 'utf-8')) as SIEMEvent[] | { logs: SIEMEvent[] };
    this.logs = Array.isArray(data) ? data : data.logs;
    this.logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  async query(filters: {
    host_id?: string;
    technique?: string;
    event_type?: string;
    since?: Date;
    until?: Date;
    severity?: string;
  }): Promise<SIEMEvent[]> {
    return this.logs.filter(log => {
      if (filters.host_id && log.host_id !== filters.host_id) return false;
      if (filters.technique && log.mitre_technique !== filters.technique) return false;
      if (filters.event_type && log.event_type !== filters.event_type) return false;
      if (filters.severity && log.severity !== filters.severity) return false;
      if (filters.since && new Date(log.timestamp) < filters.since) return false;
      if (filters.until && new Date(log.timestamp) > filters.until) return false;
      return true;
    });
  }

  async getTimeline(host_id: string): Promise<SIEMEvent[]> {
    return this.logs
      .filter(l => l.host_id === host_id)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  async getEarliestEvent(host_id: string): Promise<SIEMEvent | null> {
    const timeline = await this.getTimeline(host_id);
    return timeline[0] || null;
  }
}