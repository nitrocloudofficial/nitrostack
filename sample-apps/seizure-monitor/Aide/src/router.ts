

import type {
  Request,
  RouterOutput,
  MeetingSlotResult,
  TaskAssignment,
  AdminDecision,
  DraftedMessage,
} from "./types.js";

import { findMeetingSlot } from "./scheduling.js";

// ========== ROUTING KEYWORDS ==========
// The exact keyword sets that decide which sub-task a request needs.
// Order and contents are unchanged from the original implementation.
const SCHEDULING_KEYWORDS = ["meeting", "schedule", "book", "slot"] as const;
const DELEGATION_KEYWORDS = ["task", "assign", "who", "owner"] as const;
const ADMIN_KEYWORDS = [
  "approve",
  "expense",
  "access",
  "policy",
  "escalat",
] as const;

/** True if `text` contains any of `keywords` (same semantics as an `||` chain). */
function matchesAny(text: string, keywords: readonly string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

// ========== NAME EXTRACTION ==========
const STOPWORDS = new Set([
  'meeting', 'schedule', 'book', 'slot', 'call', 'incident', 'review',
  'task', 'assign', 'postmortem', 'doc', 'update', 'war', 'room',
  'eng', 'design', 'support', 'general', 'channel', 'slack', 'discord',
  'the', 'a', 'an', 'and', 'for', 'with', 'between', 'invite', 'include',
  'please', 'to', 'at', 'on', 'in', 'is', 'are', 'am', 'i', 'we', 'you', 
  'he', 'she', 'it', 'they', 'them', 'us', 'me', 'my', 'your', 'his', 
  'her', 'their', 'our', 'this', 'that', 'these', 'those', 'or', 'of'
]);

/** Extract person names mentioned after 'with', 'for', 'between', etc. */
function extractAttendees(text: string): string[] {
  const pattern = /(?:with|for|between|invite|include)\s+([A-Za-z]+(?:\s*(?:,|and)\s*[A-Za-z]+)*)/gi;
  const names: string[] = [];
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const parts = match[1].split(/\s*(?:,|and)\s*/i).map(s => s.trim()).filter(Boolean);
    names.push(...parts.filter(p => !STOPWORDS.has(p.toLowerCase())));
  }

  // Fallback: if no preposition matched, assume any non-stopword might be a name
  if (names.length === 0) {
    const words = text.split(/\s+/).map(w => w.replace(/[^a-zA-Z]/g, '').trim()).filter(Boolean);
    names.push(...words.filter(w => !STOPWORDS.has(w.toLowerCase())));
  }

  const unique = [...new Set(names.map(n => n.charAt(0).toUpperCase() + n.slice(1).toLowerCase()))];
  return unique;
}

/** Extract #channel from text, default to #general. */
function extractChannel(text: string): string {
  const match = text.match(/#([a-z0-9_-]+)/i);
  return match ? `#${match[1]}` : '#general';
}

// ========== STUBS (hardcoded – do NOT call real agents yet) ==========
// TODO(Person A): replace `stubSchedulingResult` with a real call to the
// scheduling agent (see `findMeetingSlot` / `bookMeeting` in ./scheduling).
const stubSchedulingResult: MeetingSlotResult = {
  time: "2025-01-15T14:00:00Z",
  attendees: ["alice", "bob", "charlie"],
  duration: 60,
  confidence: "high",
};

// TODO(Person A): replace `stubDelegationResult` with a real call to the
// delegation agent (./delegation) once it is implemented.
const stubDelegationResult: TaskAssignment = {
  taskId: "task-001",
  owner: "alice",
  deadline: "2025-01-17T17:00:00Z",
  priority: "high",
  reasoning: "Alice has lowest current workload on this domain.",
};

// TODO(Person A): replace `stubAdminResult` with a real call to the admin
// agent once it is implemented.
const stubAdminResult: AdminDecision = {
  approved: true,
  reason: "Request within policy limits.",
  escalationRequired: false,
};

// ========== MESSAGE FORMATTING ==========
const NO_ACTION_MESSAGE =
  "No specific action detected. Please clarify the request.";

function formatScheduling(result: MeetingSlotResult): string {
  return `Meeting booked at ${result.time} for ${result.attendees.join(", ")} (${result.duration} min, confidence: ${result.confidence})`;
}

function formatDelegation(result: TaskAssignment): string {
  return `Task ${result.taskId} assigned to ${result.owner} (deadline ${result.deadline}, priority ${result.priority}). Reason: ${result.reasoning}`;
}

function formatAdmin(result: AdminDecision): string {
  return `Admin decision: ${result.approved ? "APPROVED" : "REJECTED"}. ${result.reason}${result.escalationRequired ? " (escalation required)" : ""}`;
}

// ========== MAIN ROUTER ==========
export async function handleRequest(req: Request): Promise<RouterOutput> {
  // 1. Read the request text
  const text = req.text.toLowerCase();

  // 2. Synchronously decide which sub-tasks are needed
  const needsScheduling = matchesAny(text, SCHEDULING_KEYWORDS);
  const needsDelegation = matchesAny(text, DELEGATION_KEYWORDS);
  const needsAdmin = matchesAny(text, ADMIN_KEYWORDS);

  // 3. Call stubs (hardcoded mock returns that match the contracts exactly)
  // TODO(Person A): await the real agent calls here instead of the stub
  // constants above. The surrounding routing logic should not need to change.
  let schedulingResult: MeetingSlotResult | undefined;

  if (needsScheduling) {
    const attendees = extractAttendees(req.text);
    const resolvedAttendees = attendees.length > 0 ? attendees : ["alice", "bob"];

    const slotResult = await findMeetingSlot({
      attendees: resolvedAttendees.map(n => n.toLowerCase()),
      durationMinutes: 60,
      urgency: "medium",
    });

    schedulingResult = {
      time: slotResult.proposedSlots.length > 0 ? slotResult.proposedSlots[0] : new Date(Date.now() + 2 * 86400000).toISOString(),
      attendees: resolvedAttendees,
      duration: 60,
      confidence: "high",
    };
  }
  const delegationResult = needsDelegation ? stubDelegationResult : undefined;
  const adminResult = needsAdmin ? stubAdminResult : undefined;

  // 4. Synthesize final message (order: scheduling, delegation, admin)
  const parts = [
    schedulingResult && formatScheduling(schedulingResult),
    delegationResult && formatDelegation(delegationResult),
    adminResult && formatAdmin(adminResult),
  ].filter((part): part is string => part !== undefined);

  if (parts.length === 0) {
    parts.push(NO_ACTION_MESSAGE);
  }

  const finalMessage: DraftedMessage = {
    text: parts.join("\n"),
    channel: extractChannel(req.text),
    format: text.includes("discord") ? "discord" : "slack",
  };

  // 5. Return full RouterOutput
  return {
    originalRequest: req,
    schedulingResult,
    delegationResult,
    adminResult,
    finalMessage,
  };
}
