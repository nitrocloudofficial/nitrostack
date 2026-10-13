export interface Evidence {
    id: string;
    type: "Log" | "PCAP" | "Screenshot" | "Memory Dump";
    name: string;
    collectedAt: string;
}

export interface Note {
    id: string;
    author: string;
    content: string;
    createdAt: string;
}

export interface TimelineEvent {
    id: string;
    timestamp: string;
    event: string;
}

export interface Investigation {
    id: string;
    title: string;
    description: string;
    severity: "Low" | "Medium" | "High" | "Critical";
    status: "Open" | "In Progress" | "Resolved";
    assignedTo: string;
    createdAt: string;

    tags: string[];
    affectedAssets: string[];
    attackTechnique: string;

    evidence: Evidence[];
    notes: Note[];
    timeline: TimelineEvent[];
}

export const INVESTIGATIONS: Investigation[] = [
    {
        id: "INV-001",
        title: "Unauthorized Login Attempt",
        description:
            "Multiple failed login attempts detected from an unknown external IP address.",
        severity: "High",
        status: "Open",
        assignedTo: "Alice",
        createdAt: "2026-07-25",

        tags: [
            "Brute Force",
            "Authentication",
            "Credential Attack",
        ],

        affectedAssets: [
            "Authentication Server",
            "Employee Portal",
        ],

        attackTechnique: "MITRE T1110 - Brute Force",

        evidence: [
            {
                id: "EV-001",
                type: "Log",
                name: "auth.log",
                collectedAt: "2026-07-25T09:15:00Z",
            },
            {
                id: "EV-002",
                type: "Screenshot",
                name: "failed-login-dashboard.png",
                collectedAt: "2026-07-25T09:20:00Z",
            },
        ],

        notes: [
            {
                id: "NOTE-001",
                author: "Alice",
                content:
                    "Initial investigation started. Source IP appears suspicious.",
                createdAt: "2026-07-25T09:30:00Z",
            },
        ],

        timeline: [
            {
                id: "TIME-001",
                timestamp: "2026-07-25T09:10:00Z",
                event: "SIEM generated brute-force alert.",
            },
            {
                id: "TIME-002",
                timestamp: "2026-07-25T09:25:00Z",
                event: "Investigation assigned to Alice.",
            },
        ],
    },

    {
        id: "INV-002",
        title: "Malware Detected",
        description:
            "Endpoint protection detected suspicious executable behavior on an employee workstation.",
        severity: "Critical",
        status: "In Progress",
        assignedTo: "Bob",
        createdAt: "2026-07-24",

        tags: [
            "Malware",
            "Endpoint",
            "Execution",
        ],

        affectedAssets: [
            "Finance-PC-07",
        ],

        attackTechnique: "MITRE T1204 - User Execution",

        evidence: [
            {
                id: "EV-003",
                type: "Memory Dump",
                name: "finance-pc.mem",
                collectedAt: "2026-07-24T11:00:00Z",
            },
            {
                id: "EV-004",
                type: "Log",
                name: "windows-event.log",
                collectedAt: "2026-07-24T11:05:00Z",
            },
        ],

        notes: [
            {
                id: "NOTE-002",
                author: "Bob",
                content:
                    "Memory acquisition completed. Malware sample isolated.",
                createdAt: "2026-07-24T11:30:00Z",
            },
        ],

        timeline: [
            {
                id: "TIME-003",
                timestamp: "2026-07-24T10:55:00Z",
                event: "Endpoint protection generated malware alert.",
            },
            {
                id: "TIME-004",
                timestamp: "2026-07-24T11:15:00Z",
                event: "Host isolated from network.",
            },
        ],
    },

    {
        id: "INV-003",
        title: "Phishing Email",
        description:
            "Employee reported a phishing email impersonating the finance department.",
        severity: "Medium",
        status: "Resolved",
        assignedTo: "Charlie",
        createdAt: "2026-07-23",

        tags: [
            "Phishing",
            "Email",
            "Social Engineering",
        ],

        affectedAssets: [
            "Corporate Mail Server",
        ],

        attackTechnique: "MITRE T1566 - Phishing",

        evidence: [
            {
                id: "EV-005",
                type: "Screenshot",
                name: "phishing-email.png",
                collectedAt: "2026-07-23T14:10:00Z",
            },
        ],

        notes: [
            {
                id: "NOTE-003",
                author: "Charlie",
                content:
                    "Sender domain blocked and phishing indicators added to email gateway.",
                createdAt: "2026-07-23T14:45:00Z",
            },
        ],

        timeline: [
            {
                id: "TIME-005",
                timestamp: "2026-07-23T14:05:00Z",
                event: "Employee reported suspicious email.",
            },
            {
                id: "TIME-006",
                timestamp: "2026-07-23T14:40:00Z",
                event: "Incident marked as resolved.",
            },
        ],
    },
];