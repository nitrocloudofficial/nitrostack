import { postToSlack, postToDiscord } from "./notify.js";
/**
 * Process router output and post to appropriate platform.
 * Called after router finishes and agents return results.
 */
export async function processRouterOutput(output) {
    if (output.finalMessage.format === "slack") {
        await postToSlack(output.finalMessage);
    }
    else if (output.finalMessage.format === "discord") {
        await postToDiscord(output.finalMessage);
    }
}
/**
 * Format router output for widget display.
 * Extracts relevant data and structures it for HTML rendering.
 */
export function formatForWidget(output) {
    return {
        request: output.originalRequest.text,
        scheduling: output.schedulingResult || null,
        delegation: output.delegationResult || null,
        admin: output.adminResult || null,
        message: output.finalMessage,
        timestamp: new Date().toISOString(),
    };
}
/**
 * Generate human-readable summary of router output.
 * Used for demo narration and README examples.
 */
export function summarizeOutput(output) {
    const parts = [];
    if (output.schedulingResult) {
        parts.push(`Meeting scheduled: ${output.schedulingResult.time} (${output.schedulingResult.attendees.length} attendees, ${output.schedulingResult.confidence} confidence)`);
    }
    if (output.delegationResult) {
        parts.push(`Task assigned: ${output.delegationResult.taskId} → ${output.delegationResult.owner} (due ${output.delegationResult.deadline})`);
    }
    if (output.adminResult) {
        const status = output.adminResult.approved ? "APPROVED" : "REJECTED";
        parts.push(`Admin decision: ${status} (${output.adminResult.reason})`);
    }
    return parts.join(" | ");
}
