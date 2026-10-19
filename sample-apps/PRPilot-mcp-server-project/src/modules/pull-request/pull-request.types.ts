/**
 * PRPilot — Pull Request Intelligence Types & Evidence Interfaces
 */

export type FileCategory =
  | 'application_logic'
  | 'tests'
  | 'config_dependencies'
  | 'documentation'
  | 'other';

export type SignalSeverity = 'high' | 'medium' | 'low';

export interface ChangedFile {
  filename: string;
  status: 'added' | 'modified' | 'removed' | 'renamed';
  additions: number;
  deletions: number;
  changes: number;
  patch_excerpt: string | null;
  is_truncated: boolean;
  category: FileCategory;
  raw_url: string | null;
}

export interface ReviewSignal {
  severity: SignalSeverity;
  code: string;
  title: string;
  file_path?: string;
  explanation: string;
  evidence_reference: string;
}

export interface PullRequestMetadata {
  owner: string;
  repo: string;
  number: number;
  title: string;
  description: string | null;
  author: string;
  author_avatar_url: string | null;
  state: 'open' | 'closed';
  is_draft: boolean;
  base_branch: string;
  head_branch: string;
  head_sha: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
  changed_files_count: number;
  additions: number;
  deletions: number;
  html_url: string;
}

export interface ChangeMap {
  total_files: number;
  total_additions: number;
  total_deletions: number;
  is_file_list_truncated: boolean;
  categories: Record<FileCategory, ChangedFile[]>;
  category_counts: Record<FileCategory, number>;
  investigation_signals: ReviewSignal[];
}

export type CheckStatus = 'completed' | 'in_progress' | 'queued' | 'pending';
export type CheckConclusion =
  | 'success'
  | 'failure'
  | 'neutral'
  | 'cancelled'
  | 'timed_out'
  | 'action_required'
  | 'skipped'
  | null;

export interface CheckItem {
  name: string;
  source: 'check_run' | 'commit_status';
  status: CheckStatus;
  conclusion: CheckConclusion;
  details_url: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export interface VerificationEvidence {
  head_sha: string;
  collected_at: string;
  summary: {
    total: number;
    passing: number;
    failing: number;
    pending: number;
    skipped: number;
    overall_status: 'passing' | 'failing' | 'pending' | 'mixed' | 'no_checks_found';
  };
  checks: CheckItem[];
  honest_assessment: string;
}

export interface ExplicitReference {
  reference: string;
  number: number;
  source: 'description' | 'commit_message';
  title?: string;
  state?: 'open' | 'closed';
  html_url?: string;
  relationship: 'explicit_reference';
}

export interface LinkedContext {
  explicit_issue_references: ExplicitReference[];
  explicit_pr_references: ExplicitReference[];
  hypotheses: Array<{
    description: string;
    rationale: string;
  }>;
}

export interface ReviewerRouteStep {
  step_number: number;
  title: string;
  target_paths: string[];
  what_to_look_for: string;
  evidence_source: string;
}

export interface ReviewDossier {
  pr: PullRequestMetadata;
  change_intent: string;
  change_map_summary: {
    total_files: number;
    additions: number;
    deletions: number;
    category_counts: Record<FileCategory, number>;
  };
  review_signals: ReviewSignal[];
  verification: VerificationEvidence;
  linked_context: LinkedContext;
  reviewer_route: ReviewerRouteStep[];
  evidence_coverage: {
    pr_metadata_examined: boolean;
    files_examined: number;
    files_truncated: boolean;
    checks_retrieved: boolean;
    commits_examined: number;
    missing_or_unavailable: string[];
  };
  confidence_and_limits: {
    verified_facts: string[];
    heuristic_signals: string[];
    unverified_hypotheses: string[];
  };
}
