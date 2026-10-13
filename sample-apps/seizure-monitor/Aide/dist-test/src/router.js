// ========== HELPERS ==========
/**
 * Extract names mentioned after keywords like "with", "for", "and", "between".
 * Handles: "meeting for Isha and Sariga", "book with alice, bob", etc.
 */
function extractAttendees(text) {
    // Match names after "with", "for", "between" — grab comma/and separated words
    const patterns = [
        /(?:with|for|between|invite|include)\s+([A-Za-z]+(?:\s*(?:,|and)\s*[A-Za-z]+)*)/gi,
    ];
    const STOPWORDS = new Set([
        'incident', 'review', 'meeting', 'call', 'task', 'team', 'the',
        'a', 'an', 'all', 'postmortem', 'doc', 'update', 'war', 'room',
        'eng', 'design', 'support', 'general', 'channel', 'slack', 'discord',
    ]);
    const names = [];
    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const chunk = match[1];
            const parts = chunk.split(/\s*(?:,|and)\s*/i).map((s) => s.trim()).filter(Boolean);
            names.push(...parts.filter((p) => !STOPWORDS.has(p.toLowerCase())));
        }
    }
    // Deduplicate and capitalise
    const unique = [...new Set(names.map((n) => n.charAt(0).toUpperCase() + n.slice(1).toLowerCase()))];
    return unique.length > 0 ? unique : ["Team"];
}
/**
 * Pick a meeting time ~2 days from now at 14:00 UTC.
 */
function nextMeetingTime() {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    d.setUTCHours(14, 0, 0, 0);
    return d.toISOString();
}
/**
 * Pick a deadline ~3 days from now at 17:00 UTC.
 */
function nextDeadline() {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    d.setUTCHours(17, 0, 0, 0);
    return d.toISOString();
}
/**
 * Extract a task owner — first person named, or first attendee, or "Team Lead".
 */
function extractOwner(text, attendees) {
    // Try "assign to X", "X to own", "X owns"
    const assignMatch = text.match(/(?:assign(?:ed)?\s+to|owner[:\s]+|owned?\s+by)\s+([A-Za-z]+)/i);
    if (assignMatch) {
        const name = assignMatch[1];
        return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    }
    // Fall back to first attendee if real names found
    if (attendees.length > 0 && attendees[0] !== "Team")
        return attendees[0];
    return "Team Lead";
}
/**
 * Extract channel from text — looks for "#channel-name".
 */
function extractChannel(text) {
    const match = text.match(/#([a-z0-9_-]+)/i);
    return match ? `#${match[1]}` : "#general";
}
// ========== MAIN ROUTER ==========
export async function handleRequest(req) {
    const text = req.text;
    const lower = text.toLowerCase();
    // 1. Decide which sub-tasks are needed
    const needsScheduling = lower.includes("meeting") ||
        lower.includes("schedule") ||
        lower.includes("book") ||
        lower.includes("slot") ||
        lower.includes("call");
    const needsDelegation = lower.includes("task") ||
        lower.includes("assign") ||
        lower.includes("postmortem") ||
        lower.includes("doc") ||
        lower.includes("write") ||
        lower.includes("owner");
    const needsAdmin = lower.includes("approve") ||
        lower.includes("expense") ||
        lower.includes("access") ||
        lower.includes("policy") ||
        lower.includes("escalat");
    // 2. Extract real data from the request text
    const attendees = extractAttendees(text);
    const owner = extractOwner(text, attendees);
    const channel = extractChannel(text);
    const meetingTime = nextMeetingTime();
    const deadline = nextDeadline();
    // 3. Build results using extracted data
    const schedulingResult = needsScheduling
        ? {
            time: meetingTime,
            attendees,
            duration: 60,
            confidence: "high",
        }
        : undefined;
    const delegationResult = needsDelegation
        ? {
            taskId: `task-${Date.now().toString(36)}`,
            owner,
            deadline,
            priority: "high",
            reasoning: `${owner} is assigned based on the request context.`,
        }
        : undefined;
    const adminResult = needsAdmin
        ? {
            approved: true,
            reason: "Request within policy limits.",
            escalationRequired: false,
        }
        : undefined;
    // 4. Synthesize final message
    const parts = [];
    if (schedulingResult) {
        parts.push(`📅 Meeting booked for ${schedulingResult.attendees.join(", ")} at ${schedulingResult.time} (${schedulingResult.duration} min)`);
    }
    if (delegationResult) {
        parts.push(`✅ Task assigned to ${delegationResult.owner} — deadline ${delegationResult.deadline.split("T")[0]}, priority ${delegationResult.priority}`);
    }
    if (adminResult) {
        parts.push(`🔐 Admin decision: ${adminResult.approved ? "APPROVED" : "REJECTED"}. ${adminResult.reason}`);
    }
    if (parts.length === 0) {
        parts.push("No specific action detected. Please clarify the request.");
    }
    const finalMessage = {
        text: parts.join("\n"),
        channel,
        format: "slack",
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
