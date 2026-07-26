import { readFile } from 'fs/promises';
export class SIEMLogsResource {
    logs = [];
    async loadFromMock(path = new URL('../../mock-data/siem-logs-temporal.json', import.meta.url)) {
        const data = JSON.parse(await readFile(path, 'utf-8'));
        this.logs = Array.isArray(data) ? data : data.logs;
        this.logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }
    async query(filters) {
        return this.logs.filter(log => {
            if (filters.host_id && log.host_id !== filters.host_id)
                return false;
            if (filters.technique && log.mitre_technique !== filters.technique)
                return false;
            if (filters.event_type && log.event_type !== filters.event_type)
                return false;
            if (filters.severity && log.severity !== filters.severity)
                return false;
            if (filters.since && new Date(log.timestamp) < filters.since)
                return false;
            if (filters.until && new Date(log.timestamp) > filters.until)
                return false;
            return true;
        });
    }
    async getTimeline(host_id) {
        return this.logs
            .filter(l => l.host_id === host_id)
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }
    async getEarliestEvent(host_id) {
        const timeline = await this.getTimeline(host_id);
        return timeline[0] || null;
    }
}
