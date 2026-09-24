export interface IdentityRecord {
  employeeId: string;
  name: string;
  email: string;
  department: string;
  role: string;
  status: "active" | "suspended" | "pending";
  groups: string[]; // AD/directory group memberships
}

export interface LicenseRecord {
  toolName: string; // e.g. "Figma", "SharedDrive", "Slack"
  totalSeats: number;
  usedSeats: number;
  requiresGroup?: string; // group membership needed to use a seat
}

export interface NetworkStatus {
  employeeId: string;
  vpnConnected: boolean;
  lastHandshake: string;
  deviceTrusted: boolean;
  errorCode?: string;
}

export interface Ticket {
  id: string;
  employeeId: string;
  issueText: string;
  status: "open" | "diagnosing" | "resolved" | "escalated";
  diagnosis?: DiagnosisResult;
  resolutionSteps: string[];
  createdAt: string;
}

export interface DiagnosisResult {
  rootCause: "none" | "not_in_group" | "no_license" | "network_issue" | "account_suspended" | "unknown";
  detail: string;
  fixable: boolean;
}
