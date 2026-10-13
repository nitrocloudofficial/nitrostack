// Hand-written for now — NitroStack's codegen can replace this once
// wired to the real Zod schemas in modules/*/*.tools.ts.

export interface Meeting {
  id: string;
  title: string;
  scheduled_start: string;
  scheduled_end: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'missed' | 'rescheduled';
  keynotes?: { type: 'action_item' | 'decision'; text: string; owner?: string }[];
}

export interface ListMeetingsOutput {
  meetings: Meeting[];
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  assigned_to?: string;
  status: 'proposed' | 'accepted' | 'denied' | 'in_progress' | 'done';
  effort_estimate?: string;
  clarity_score?: number;
  denial_reason?: string;
}

export interface ListTasksOutput {
  tasks: Task[];
}
