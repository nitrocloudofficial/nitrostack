export interface TimelineEvent {
  date: string;
  type: "Commit" | "Meeting" | "Document";
  title: string;
  description: string;
}

export interface Evidence {
  commits: number;
  meetings: number;
  documents: number;
}

export interface Verdict {
  summary: string;
  rootCause: string;
  recommendation: string;
  confidence: number;
}

export interface Investigation {

  caseId: string;

  question: string;

  file: string;

  project: string;

  status:
    | "Created"
    | "Collecting Evidence"
    | "Generating Timeline"
    | "Completed";

  createdAt: string;

  primaryAuthor: string;

  evidence: Evidence;

  timeline: TimelineEvent[];

  verdict: Verdict;
}