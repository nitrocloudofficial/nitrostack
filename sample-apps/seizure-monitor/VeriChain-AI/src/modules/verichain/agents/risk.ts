import { callLlm } from '../utils/llm-helper.js';
import { EvidenceItem } from './evidence.js';
import { ConflictItem } from './conflict.js';

export interface RiskResult {
    financial_risk: number;
    compliance_risk: number;
    operational_risk: number;
    business_risk: number;
    overall_risk_score: number;
    reasons: string[];
}

export async function runRiskAnalysis(
    evidenceList: EvidenceItem[], 
    conflicts: ConflictItem[]
): Promise<RiskResult> {
    console.log("Running Risk Analysis Agent.");
    
    const systemPrompt = 
        "You are an expert Risk Analysis Agent in an enterprise AI platform.\n" +
        "Your task is to analyze evidence and detected conflicts, then calculate risk scores " +
        "across four categories (0 to 100):\n" +
        "- financial_risk: Calculated based on budget overruns, cost discrepancies, or balance gaps.\n" +
        "- compliance_risk: Calculated based on missing approvals, policies, or blacklists.\n" +
        "- operational_risk: Calculated based on version mismatches, missing details, or outdated info.\n" +
        "- business_risk: Overall threat of project/vendor engagement.\n" +
        "Also compute an overall_risk_score (0-100) and list reasons for elevated scores.\n" +
        "Respond ONLY with a JSON object containing:\n" +
        "{\n" +
        "  'financial_risk': int,\n" +
        "  'compliance_risk': int,\n" +
        "  'operational_risk': int,\n" +
        "  'business_risk': int,\n" +
        "  'overall_risk_score': int,\n" +
        "  'reasons': [str]\n" +
        "}\n" +
        "Respond ONLY with the JSON structure.";

    const userPrompt = JSON.stringify({
        evidence: evidenceList.map(ev => ({ doc_id: ev.doc_id, entity: ev.entity, claim: ev.claim, category: ev.category, value: ev.value })),
        conflicts: conflicts
    }, null, 2);

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
            const riskResult = JSON.parse(cleanedRes.trim()) as RiskResult;
            console.log("Risk Analysis executed successfully via LLM.");
            return riskResult;
        } catch (e) {
            console.error(`Failed to parse LLM risk analysis: ${e}. Falling back to heuristics.`);
        }
    }

    // Rule-based heuristics fallback
    console.log("Risk Analysis fallback heuristics triggered.");
    
    let finBase = 15;
    let compBase = 10;
    let opBase = 12;
    let busBase = 10;
    const reasons: string[] = [];

    for (const conflict of conflicts) {
        const ctype = conflict.conflict_type;
        const sev = conflict.severity || "medium";
        const desc = conflict.description || "";
        
        const weight = sev === "high" ? 25 : 15;
        
        if (ctype === "value_discrepancy") {
            finBase += weight;
            busBase += Math.floor(weight / 2);
            reasons.push(`Financial: ${desc}`);
        } else if (ctype === "policy_violation") {
            compBase += weight;
            busBase += weight;
            reasons.push(`Compliance: ${desc}`);
        } else if (ctype === "version_mismatch") {
            opBase += weight;
            reasons.push(`Operational: ${desc}`);
        } else if (ctype === "missing_approval") {
            compBase += weight;
            opBase += Math.floor(weight / 2);
            reasons.push(`Approval missing: ${desc}`);
        }
    }

    // Penalize for low credibility evidence
    const lowCredibilityCount = evidenceList.filter(ev => (ev.credibility_score || 1.0) < 0.65).length;
    if (lowCredibilityCount > 0) {
        busBase += Math.min(20, lowCredibilityCount * 8);
        reasons.push(`Found ${lowCredibilityCount} pieces of low-credibility evidence.`);
    }
    
    const financialRisk = Math.min(100, finBase);
    const complianceRisk = Math.min(100, compBase);
    const operationalRisk = Math.min(100, opBase);
    const businessRisk = Math.min(100, busBase);
    
    const overallScore = Math.floor((financialRisk + complianceRisk + operationalRisk + businessRisk) / 4);
    
    if (reasons.length === 0) {
        reasons.push("No critical risk indicators detected. Standard baseline risk applied.");
    }
    
    return {
        financial_risk: financialRisk,
        compliance_risk: complianceRisk,
        operational_risk: operationalRisk,
        business_risk: businessRisk,
        overall_risk_score: overallScore,
        reasons: reasons
    };
}
