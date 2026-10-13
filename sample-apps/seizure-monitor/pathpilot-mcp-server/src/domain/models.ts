export type EvidenceStatus = 'Verified' | 'Partial' | 'Missing' | 'Self-reported';

export type Provider = 'github' | 'linkedin';

export type PathwayId = 'full-stack-developer';

export type ErrorCode =
  | 'INVALID_REPOSITORY'
  | 'ACCESS_DENIED'
  | 'PROFILE_NOT_CONNECTED'
  | 'PROVIDER_UNAVAILABLE'
  | 'RATE_LIMITED'
  | 'UNSUPPORTED_CONTENT'
  | 'ANALYSIS_LIMIT_EXCEEDED'
  | 'ANALYSIS_NOT_FOUND'
  | 'NOT_FOUND';

export interface RepositoryRef {
  provider: 'github';
  owner: string;
  repo: string;
  url: string;
  branch?: string;
}

export interface FileNode {
  path: string;
  type: 'file' | 'dir' | 'symlink';
  size?: number;
  sha?: string;
}

export interface ManifestData {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  raw: string;
  sourcePath: string;
}

export interface SelectedFileContent {
  path: string;
  content: string;
  truncated: boolean;
  truncatedAt?: number;
}

export interface TruncationInfo {
  fileCount: { budget: number; used: number };
  contentRead: { budget: number; used: number };
  totalTextKb: { budget: number; used: number };
  pathsExcluded: string[];
}

export interface RepositorySnapshot {
  repository: RepositoryRef;
  branch: string;
  files: FileNode[];
  manifest?: ManifestData;
  readme?: string;
  selectedFiles: SelectedFileContent[];
  collectedAt: string;
  truncation?: TruncationInfo;
  warnings: string[];
}

export interface ProfileRole {
  title: string;
  company?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

export interface ProfileEducation {
  school: string;
  degree?: string;
  field?: string;
  startDate?: string;
  endDate?: string;
}

export interface ProfileCertification {
  name: string;
  issuer?: string;
  date?: string;
  credentialId?: string;
}

export interface ProfileProject {
  name: string;
  description?: string;
  url?: string;
  dates?: string;
}

export interface ProfileSnapshot {
  provider: 'linkedin';
  profileRef: string;
  connected: boolean;
  declaredSkills: string[];
  roles: ProfileRole[];
  education: ProfileEducation[];
  certifications: ProfileCertification[];
  projects: ProfileProject[];
  collectedAt: string;
}

export interface EvidenceItem {
  provider: Provider;
  kind: string;
  pathOrField: string;
  excerpt?: string;
  ruleId?: string;
  weight?: number;
}

export interface SkillEvidence {
  skill: string;
  status: EvidenceStatus;
  confidence?: number;
  summary: string;
  sources: Array<{ provider: Provider; field?: string }>;
  evidence: EvidenceItem[];
  inspected: string[];
  nextEvidence: string;
}

export interface RoadmapSignal {
  verified: string[];
  selfReported: string[];
  partial: string[];
  missing: string[];
  priorityGap: string;
  suggestedTask: string;
  rationale: string;
}

export interface UnifiedAnalysisResult {
  id: string;
  requestId: string;
  pathway: PathwayId;
  repository?: RepositorySnapshot;
  profile?: ProfileSnapshot;
  skillEvidence: SkillEvidence[];
  roadmapSignal: RoadmapSignal;
  warnings: string[];
  createdAt: string;
}

export interface EvidenceCard {
  skill: string;
  status: EvidenceStatus;
  confidence?: number;
  summary: string;
  sources: Array<{ provider: Provider; label: string }>;
  evidenceHighlights: string[];
  nextStep: string;
}

export interface DashboardSummary {
  analysisId: string;
  repositoryName?: string;
  profileConnected: boolean;
  totalSkills: number;
  verifiedCount: number;
  partialCount: number;
  selfReportedCount: number;
  missingCount: number;
  priorityGap: string;
  topStrengths: string[];
  createdAt: string;
}

export interface Envelope<T> {
  requestId: string;
  status: 'success' | 'error' | 'partial';
  data?: T;
  warnings: string[];
  error?: {
    code: ErrorCode;
    message: string;
    retryable: boolean;
    details?: Record<string, unknown>;
  };
}
