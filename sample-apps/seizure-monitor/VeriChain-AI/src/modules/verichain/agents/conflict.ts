import { callLlm } from '../utils/llm-helper.js';
import { EvidenceItem } from './evidence.js';

export interface ConflictItem {
    doc_id_1: number | null;
    doc_id_2: number | null;
    description: string;
    severity: string;
    conflict_type: string;
    status: string;
}

export async function runConflictDetection(evidenceList: EvidenceItem[]): Promise<ConflictItem[]> {
    console.log(`Running Conflict Detection Agent on ${evidenceList.length} evidence claims.`);
    
    if (evidenceList.length === 0) {
        return [];
    }

    const systemPrompt = 
        "You are an expert Conflict Detection Agent in an enterprise AI system.\n" +
        "Your task is to review the list of evidence claims from multiple documents and identify:\n" +
        "1. Version Mismatches: Outdated reports/agreements vs newer ones.\n" +
        "2. Value Discrepancies: Different prices, budget totals, or dates for the same entity.\n" +
        "3. Compliance/Policy Violations: Missing approvals, signatures, or terms that violate policies.\n" +
        "Respond ONLY with a JSON list of conflict objects. If no conflicts are found, respond with [].\n" +
        "Each conflict object must have:\n" +
        "- doc_id_1: ID of first document in conflict.\n" +
        "- doc_id_2: ID of second document in conflict.\n" +
        "- description: A clear sentence describing the conflict.\n" +
        "- severity: 'low', 'medium', or 'high'.\n" +
        "- conflict_type: 'version_mismatch', 'value_discrepancy', 'policy_violation', 'missing_approval'.\n" +
        "- status: 'detected'.";

    const userPrompt = JSON.stringify({ evidence: evidenceList }, null, 2);
    const response = await callLlm(systemPrompt, userPrompt, true);

    if (response) {
        try {
            let cleanedRes = response.trim();
            if (cleanedRes.startsWith("```json")) {
                cleanedRes = cleanedRes.substring(7);
            }
            if (cleanedRes.endsWith("```")) {
                cleanedRes = cleanedRes.substring(0, cleanedRes.length - 3);
            }
            const conflicts = JSON.parse(cleanedRes.trim()) as any[];
            console.log(`Conflict Agent detected ${conflicts.length} conflicts via LLM.`);
            
            return conflicts.map(cf => ({
                doc_id_1: cf.doc_id_1 !== undefined ? (cf.doc_id_1 === null ? null : Number(cf.doc_id_1)) : null,
                doc_id_2: cf.doc_id_2 !== undefined ? (cf.doc_id_2 === null ? null : Number(cf.doc_id_2)) : null,
                description: cf.description || "Conflict detected",
                severity: cf.severity || "medium",
                conflict_type: cf.conflict_type || "value_discrepancy",
                status: "detected"
            }));
        } catch (e) {
            console.error(`Failed to parse LLM conflicts: ${e}. Falling back to heuristics.`);
        }
    }

    // Rule-based heuristics fallback
    console.log("Conflict Agent fallback heuristics triggered.");
    const conflicts: ConflictItem[] = [];

    // Heuristic 1: Cross-check values of similar entities (e.g. Budget)
    const budgets = evidenceList.filter(ev => ev.category === "Budget");
    if (budgets.length > 1) {
        for (let i = 0; i < budgets.length; i++) {
            for (let j = i + 1; j < budgets.length; j++) {
                const valI = budgets[i].value || "";
                const valJ = budgets[j].value || "";
                
                // Extract numbers
                const numIMatch = valI.replace(/,/g, '').match(/\d+/);
                const numJMatch = valJ.replace(/,/g, '').match(/\d+/);
                
                if (numIMatch && numJMatch && numIMatch[0] !== numJMatch[0]) {
                    const numI = parseInt(numIMatch[0], 10);
                    const numJ = parseInt(numJMatch[0], 10);
                    
                    conflicts.push({
                        doc_id_1: budgets[i].doc_id,
                        doc_id_2: budgets[j].doc_id,
                        description: `Mismatched budget allocations found: ${budgets[i].doc_name} states ${valI} while ${budgets[j].doc_name} states ${valJ}.`,
                        severity: Math.abs(numI - numJ) > 50000 ? "high" : "medium",
                        conflict_type: "value_discrepancy",
                        status: "detected"
                    });
                }
            }
        }
    }

    // Heuristic 2: Version and date mismatch checks
    const dates = evidenceList.filter(ev => ev.category === "Date");
    if (dates.length > 1) {
        for (let i = 0; i < dates.length; i++) {
            for (let j = i + 1; j < dates.length; j++) {
                const valI = dates[i].value || "";
                const valJ = dates[j].value || "";
                
                const yearIMatch = valI.match(/\b(20\d{2})\b/);
                const yearJMatch = valJ.match(/\b(20\d{2})\b/);
                
                if (yearIMatch && yearJMatch && yearIMatch[0] !== yearJMatch[0]) {
                    conflicts.push({
                        doc_id_1: dates[i].doc_id,
                        doc_id_2: dates[j].doc_id,
                        description: `Version date mismatch detected: ${dates[i].doc_name} has date/version '${valI}' but ${dates[j].doc_name} has newer date/version '${valJ}'.`,
                        severity: "medium",
                        conflict_type: "version_mismatch",
                        status: "detected"
                    });
                }
            }
        }
    }

    // Heuristic 3: Compliance/policy violation words check
    for (const ev of evidenceList) {
        const claimLower = (ev.claim || "").toLowerCase();
        if (["blacklist", "fail", "reject", "warning", "violation", "not approved", "missing signature"].some(w => claimLower.includes(w))) {
            conflicts.push({
                doc_id_1: ev.doc_id,
                doc_id_2: null,
                description: `Policy compliance risk in ${ev.doc_name}: '${ev.claim}'`,
                severity: (claimLower.includes("blacklist") || claimLower.includes("violation")) ? "high" : "medium",
                conflict_type: "policy_violation",
                status: "detected"
            });
        }
    }

    console.log(`Conflict Agent finished with ${conflicts.length} detected conflicts.`);
    return conflicts;
}
