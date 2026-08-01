/**
 * GroundTruth domain types.
 *
 * Deliberately minimal — this is a hackathon MVP. The whole dataset lives in a
 * single JSON file (see store.ts) so there is no database to provision.
 */

export interface Employee {
  id: string;
  name: string;
  role: string;
  teamId: string;
  /** GitHub login used to attribute commits and PRs to this person. */
  githubUsername: string;
  /**
   * Optional git commit email.
   *
   * GitHub only links a commit to a user account when the commit's author email
   * is registered on that account. A mismatched `git config user.email` — very
   * common — leaves commits showing as an unlinked author, and filtering by
   * login alone then finds nothing. Setting this lets attribution fall back to
   * the raw commit email.
   */
  githubEmail?: string;
}

/** A single claim pulled out of an employee's free-text report. */
export interface ExtractedClaim {
  text: string;
  /** Whether the claim asserts finished work ("done", "shipped") or work in progress. */
  assertsCompletion: boolean;
}

export interface EODReport {
  id: string;
  employeeId: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  rawText: string;
  /** Self-reported confidence, 1 (struggling) to 5 (on track). */
  confidence: number;
  submittedAt: string;
  /** Deterministic pre-parse of rawText, written on submit. A fallback: the
   * agent is expected to read rawText and supply better claims itself. */
  claims?: ExtractedClaim[];
  blockers?: string[];
  sentiment?: 'positive' | 'neutral' | 'negative';
}

export interface CommitRecord {
  sha: string;
  message: string;
  repo: string;
  /**
   * The local calendar day this commit counts towards, and the local wall clock.
   *
   * Listed before the UTC instant, and the UTC field is named for what it is,
   * because a reader anchors on whichever date it meets first. A commit made at
   * 00:29 IST is stamped 18:59Z the *previous* day; a field called `committedAt`
   * sitting at the top of the object got read as the calendar date, and a review
   * reported "zero commits today" while listing seven of them.
   */
  localDate: string;
  localTime: string;
  /** The raw UTC instant from GitHub. May carry a different calendar date. */
  committedAtUtc: string;
  url: string;
}

export interface PullRequestRecord {
  number: number;
  title: string;
  repo: string;
  state: 'open' | 'closed';
  merged: boolean;
  createdAt: string;
  url: string;
}

/**
 * The result of comparing what someone said they did against what GitHub shows.
 * `verdict` is a signal for the agent to reason about — not a decision in itself.
 */
export interface ActivityCheck {
  reportId: string;
  employeeId: string;
  date: string;
  commits: CommitRecord[];
  pullRequests: PullRequestRecord[];
  /** 0..1 — rough overlap between claim wording and real activity. */
  matchScore: number;
  verdict: 'consistent' | 'partial' | 'unsupported' | 'no-claims';
  /** Human-readable observations for the agent to weigh. */
  observations: string[];
  checkedAt: string;
}

export type AlertSeverity = 'low' | 'medium' | 'high';

export interface Alert {
  id: string;
  employeeId: string;
  teamId: string;
  date: string;
  reason: string;
  severity: AlertSeverity;
  createdAt: string;
  resolved: boolean;
}

export interface GroundTruthData {
  employees: Employee[];
  reports: EODReport[];
  activityChecks: ActivityCheck[];
  alerts: Alert[];
}
