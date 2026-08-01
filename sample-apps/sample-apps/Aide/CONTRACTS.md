# AIDE Contracts (Locked – Hour 0)

These are the **only** types that exist between the router and the agents.
Everyone must match them exactly.

```typescript
interface MeetingSlotResult {
  time: string; // ISO 8601
  attendees: string[];
  duration: number; // minutes
  confidence: "high" | "medium" | "low";
}

interface TaskAssignment {
  taskId: string;
  owner: string;
  deadline: string; // ISO 8601
  priority: "high" | "medium" | "low";
  reasoning: string;
}

interface AdminDecision {
  approved: boolean;
  reason: string;
  escalationRequired: boolean;
}

interface DraftedMessage {
  text: string;
  channel: string; // from channels resource
  format: "slack" | "discord";
}

interface Request {
  text: string;
  userId: string;
  timestamp: string;
}

interface RouterOutput {
  originalRequest: Request;
  schedulingResult?: MeetingSlotResult;
  delegationResult?: TaskAssignment;
  adminResult?: AdminDecision;
  finalMessage: DraftedMessage;
}