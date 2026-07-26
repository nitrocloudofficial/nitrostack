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
export declare class SIEMLogsResource {
    private logs;
    loadFromMock(path?: string | URL): Promise<void>;
    query(filters: {
        host_id?: string;
        technique?: string;
        event_type?: string;
        since?: Date;
        until?: Date;
        severity?: string;
    }): Promise<SIEMEvent[]>;
    getTimeline(host_id: string): Promise<SIEMEvent[]>;
    getEarliestEvent(host_id: string): Promise<SIEMEvent | null>;
}
//# sourceMappingURL=siem-logs.d.ts.map