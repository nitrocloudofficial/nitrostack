export type InvestigationCategory =
  | "Authentication"
  | "Authorization"
  | "Payment"
  | "Checkout"
  | "Database"
  | "Deployment"
  | "Performance"
  | "Memory Leak"
  | "Security"
  | "API"
  | "CI/CD"
  | "Build Failure"
  | "Kubernetes"
  | "Infrastructure"
  | "Networking"
  | "Logging"
  | "Monitoring";

export interface ScenarioAuthor {
  id: string;
  name: string;
  role: string;
  team: string;
}

export interface ScenarioCommit {
  id: string;
  message: string;
  date: string;
  authorId: string;
  file: string;
  project: string;
  meetingId?: string;
  documentId?: string;
}

export interface ScenarioMeeting {
  id: string;
  title: string;
  decision: string;
  date: string;
}

export interface ScenarioDocument {
  id: string;
  title: string;
  summary: string;
}

export interface InvestigationScenario {
  category: InvestigationCategory;
  project: string;
  file: string;
  primaryAuthor: ScenarioAuthor;
  commits: ScenarioCommit[];
  meetings: ScenarioMeeting[];
  documents: ScenarioDocument[];
  summaryTemplate: string;
  rootCauseTemplate: string;
  recommendations: string[];
  baseConfidence: number;
}
