import type { Capability } from './capability.js';

export type Severity = 'critical' | 'high' | 'medium';

export interface PolicyRule {
    id: string;
    source: Capability;
    sink: Capability;
    severity: Severity;
    message: string;
}

// Toxic-combination rules (data, not code) — see CLAUDE.md §4.2.
export const POLICY_RULES: PolicyRule[] = [
    {
        id: 'exfiltration',
        source: 'READ_PRIVATE_DATA',
        sink: 'SEND_EXTERNAL',
        severity: 'critical',
        message: 'Agent can read private data AND send it externally — data exfiltration path.',
    },
    {
        id: 'public-leak',
        source: 'READ_PRIVATE_DATA',
        sink: 'WRITE_PUBLIC',
        severity: 'high',
        message: 'Agent can read private data AND post it publicly — accidental public-leak path.',
    },
    {
        id: 'destructive',
        source: 'DELETE_DATA',
        sink: 'EXECUTE',
        severity: 'high',
        message: 'Agent can delete data AND execute arbitrary actions — destructive automation path.',
    },
];
