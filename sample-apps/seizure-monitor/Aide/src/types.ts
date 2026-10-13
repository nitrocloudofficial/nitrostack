export interface DraftedMessage {
    text: string;
    channel: string;
    format: "slack" | "discord";
}
export interface MeetingSlotResult {
  time: string; // ISO 8601
  attendees: string[];
  duration: number; // minutes
  confidence: "high" | "medium" | "low";
}

export interface TaskAssignment {
  taskId: string;
  owner: string;
  deadline: string; // ISO 8601
  priority: "high" | "medium" | "low";
  reasoning: string;
}

export interface AdminDecision {
  approved: boolean;
  reason: string;
  escalationRequired: boolean;
}


export interface Request {
  text: string;
  userId: string;
  timestamp: string;
}

export interface RouterOutput {
  originalRequest: Request;
  schedulingResult?: MeetingSlotResult;
  delegationResult?: TaskAssignment;
  adminResult?: AdminDecision;
  finalMessage: DraftedMessage;
}