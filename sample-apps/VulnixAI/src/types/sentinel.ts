export type Severity = "critical" | "high" | "medium" | "low";

export interface Vulnerability {
  id: string;
  title: string;
  severity: Severity;
  scanner: string;
  file: string;
  line: number;
  description: string;
  cweId: string;
  fixAvailable: boolean;
  originalCode: string;
  patchedCode: string;
}

export interface ScanResult {
  id: string;
  repoName: string;
  status: "queued" | "scanning" | "completed" | "failed";
  startedAt: string;
  completedAt?: string;
  vulnerabilities: Vulnerability[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
    patchable: number;
  };
}

export interface Repository {
  id: string;
  name: string;
  fullName: string;
  language: string;
  updatedAt: string;
  isPrivate: boolean;
  stars: number;
}

export interface ScanLog {
  time: string;
  message: string;
  level: "info" | "success" | "warning" | "error";
}
