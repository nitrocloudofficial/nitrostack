export interface Agent {
  id: number;
  name: string;
  department: string;
  owner: string;
  risk: number;
  status: "ACTIVE" | "QUARANTINED";
  permissions: string[];
  tools: string[];
  lastSeen: string;
}

export const agents: Agent[] = [
  {
    id: 1,
    name: "FinanceBot",
    department: "Finance",
    owner: "Finance Department",
    risk: 18,
    status: "ACTIVE",
    permissions: [
      "read_reports",
      "generate_reports"
    ],
    tools: [
      "database",
      "email"
    ],
    lastSeen: "2026-07-25T10:12:00Z"
  },

  {
    id: 2,
    name: "HRBot",
    department: "Human Resources",
    owner: "HR Department",
    risk: 26,
    status: "ACTIVE",
    permissions: [
      "employee_records"
    ],
    tools: [
      "employee_db"
    ],
    lastSeen: "2026-07-25T10:18:00Z"
  },

  {
    id: 3,
    name: "SupportBot",
    department: "Customer Support",
    owner: "Support Team",
    risk: 12,
    status: "ACTIVE",
    permissions: [
      "faq",
      "tickets"
    ],
    tools: [
      "ticket_system"
    ],
    lastSeen: "2026-07-25T10:22:00Z"
  },

  {
    id: 4,
    name: "UnknownBot",
    department: "Unknown",
    owner: "Unknown",
    risk: 96,
    status: "QUARANTINED",
    permissions: [],
    tools: [
      "database"
    ],
    lastSeen: "2026-07-25T10:30:00Z"
  }
];