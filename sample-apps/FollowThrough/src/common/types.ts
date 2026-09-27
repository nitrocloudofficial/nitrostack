export type ConfidenceLevel = 'committed' | 'hedged' | 'aspirational';

export type CommitmentStatus = 'open' | 'nudged_1' | 'nudged_2' | 'escalated' | 'done' | 'expired';

export type NudgeTone = 'gentle' | 'specific' | 'urgent';

export type EvidenceSource = 'slack' | 'email';

export interface Person {
  name: string;
  email?: string;
  slack_id?: string;
  manager_email?: string;
}

export interface Beneficiary {
  name: string;
  type: 'internal' | 'external';
}

export interface EvidenceEntry {
  source: EvidenceSource;
  ref: string;
  summary: string;
  matched_score: number;
}

export interface NudgeEntry {
  type: string;
  sent_at: string;
  channel: string;
  tone: NudgeTone;
  message_body: string;
}

export interface Escalation {
  manager: string;
  escalated_at: string | null;
  reason: string | null;
}

export interface Commitment {
  commitment_id: string;
  meeting_id: string;
  text_raw: string;
  owner: Person;
  beneficiary: Beneficiary;
  what: string;
  due_date: string;
  confidence_level: ConfidenceLevel;
  confidence_phrase: string;
  status: CommitmentStatus;
  linked_ticket_id: string | null;
  evidence_log: EvidenceEntry[];
  nudge_log: NudgeEntry[];
  escalation: Escalation | null;
  created_at: string;
  updated_at: string;
}

export interface SlackMessage {
  message_id: string;
  channel: string;
  author: string;
  author_slack_id?: string;
  text: string;
  timestamp: string;
}

export interface EmailMessage {
  message_id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  timestamp: string;
}

export interface Ticket {
  ticket_id: string;
  title: string;
  description: string;
  assignee_email: string;
  due_date: string;
  labels: string[];
  status: string;
  watchers: string[];
  escalation_comment: string | null;
  created_at: string;
}

export interface CreateTicketInput {
  title: string;
  description?: string;
  assignee_email?: string;
  due_date?: string;
  labels?: string[];
}

export interface ExtractResult {
  commitment_id?: string;
  meeting_id: string;
  text_raw: string;
  owner: Person;
  beneficiary: Beneficiary;
  what: string;
  due_date: string;
  confidence_level: ConfidenceLevel;
  confidence_phrase: string;
}
