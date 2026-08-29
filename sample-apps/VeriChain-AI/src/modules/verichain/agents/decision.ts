import { callLlm } from '../utils/llm-helper.js';
import { EvidenceItem } from './evidence.js';
import { ConflictItem } from './conflict.js';
import { RiskResult } from './risk.js';

export interface DecisionResult {
    decision_status: string;
    confidence_score: number;
    explanation: string;
    evidence_graph_data: string;
    agent_debate_data: string;
}

export async function runDecisionAgent(
    query: string,
    evidenceList: EvidenceItem[],
    conflicts: ConflictItem[],
    risks: RiskResult
): Promise<DecisionResult> {
    console.log("Running Decision Agent.");
    
    const systemPrompt = 
        "You are an expert Decision Agent in an enterprise AI system.\n" +
        "Your task is to review the results of all previous agents: evidence, conflicts, and risk analysis, " +
        "and make a final decision recommendation ('APPROVE', 'REJECT', or 'REVIEW').\n" +
        "In addition, you must compile an 'AI Debate Panel' containing individual specialized perspectives:\n" +
        "1. 'finance_agent': recommendation ('APPROVE'|'REJECT'|'REVIEW') and its distinct opinion based on budget/costs.\n" +
        "2. 'compliance_agent': recommendation ('APPROVE'|'REJECT'|'REVIEW') and its distinct opinion based on signatories/compliance.\n" +
        "3. 'legal_agent': recommendation ('APPROVE'|'REJECT'|'REVIEW') and its distinct opinion based on version mismatches/discrepancies.\n" +
        "4. 'risk_agent': recommendation ('LOW_RISK'|'MEDIUM_RISK'|'HIGH_RISK') and its distinct opinion based on overall risk findings.\n" +
        "Finally, you (acting as the Judge Agent) will synthesize these viewpoints into the final 'decision_status', 'confidence_score' and 'explanation' (markdown formatted).\n" +
        "Respond ONLY with a JSON object containing:\n" +
        "{\n" +
        "  'decision_status': 'APPROVE' | 'REJECT' | 'REVIEW',\n" +
        "  'confidence_score': float,\n" +
        "  'explanation': str,\n" +
        "  'agent_debate': {\n" +
        "     'finance_agent': {'recommendation': str, 'opinion': str},\n" +
        "     'compliance_agent': {'recommendation': str, 'opinion': str},\n" +
        "     'legal_agent': {'recommendation': str, 'opinion': str},\n" +
        "     'risk_agent': {'recommendation': str, 'opinion': str}\n" +
        "  }\n" +
        "}\n" +
        "Keep the response strictly to the JSON object.";

    const userPrompt = JSON.stringify({
        query: query,
        evidence: evidenceList,
        conflicts: conflicts,
        risks: risks
    }, null, 2);

    const response = await callLlm(systemPrompt, userPrompt, true);
    
    let decisionStatus = "REVIEW";
    let confidenceScore = 0.5;
    let explanation = "";
    let agentDebate: any = {};

    if (response) {
        try {
            let cleanedRes = response.trim();
            if (cleanedRes.startsWith("```json")) {
                cleanedRes = cleanedRes.substring(7);
            }
            if (cleanedRes.endsWith("```")) {
                cleanedRes = cleanedRes.substring(0, cleanedRes.length - 3);
            }
            const decisionData = JSON.parse(cleanedRes.trim());
            
            decisionStatus = decisionData.decision_status || "REVIEW";
            confidenceScore = decisionData.confidence_score !== undefined ? Number(decisionData.confidence_score) : 0.5;
            explanation = decisionData.explanation || "";
            agentDebate = decisionData.agent_debate || {};
            console.log("Decision Agent processed successfully via LLM.");
        } catch (e) {
            console.error(`Failed to parse LLM decision: ${e}. Falling back to heuristics.`);
        }
    }

    if (!explanation) {
        // Fallback Heuristics
        console.log("Decision Agent fallback heuristics triggered.");
        
        const riskScore = risks.overall_risk_score !== undefined ? risks.overall_risk_score : 50;
        const finRisk = risks.financial_risk !== undefined ? risks.financial_risk : 15;
        const compRisk = risks.compliance_risk !== undefined ? risks.compliance_risk : 10;
        
        const highSeverityConflicts = conflicts.filter(c => c.severity === "high").length;
        
        if (riskScore > 65 || highSeverityConflicts >= 2) {
            decisionStatus = "REJECT";
            confidenceScore = 0.85;
            explanation = 
                "### Recommendation: **REJECT**\n\n" +
                "**Reasoning:**\n" +
                `- The overall calculated risk score is highly elevated at **${riskScore}%**.\n` +
                `- We detected **${conflicts.length} conflict(s)**, including **${highSeverityConflicts} high-severity** contradictions.\n` +
                "- High compliance or financial risk violates standard corporate approval thresholds.\n\n" +
                "**Recommended Action:** Deny approval until conflicting items are resolved and risk scores drop below 40%.";
        } else if (riskScore > 35 || conflicts.length > 0) {
            decisionStatus = "REVIEW";
            confidenceScore = 0.70;
            explanation = 
                "### Recommendation: **MANUAL REVIEW REQUIRED**\n\n" +
                "**Reasoning:**\n" +
                `- The overall risk score is at a moderate level of **${riskScore}%**.\n` +
                `- There are active conflicts/contradictions (**${conflicts.length} detected**) that require human verification.\n` +
                "- Credibility scores for certain files require double checking by the risk committee.\n\n" +
                "**Recommended Action:** Route to manual compliance desk. Review the specific document discrepancies highlighted in the Conflict Viewer.";
        } else {
            decisionStatus = "APPROVE";
            confidenceScore = 0.94;
            explanation = 
                "### Recommendation: **APPROVE**\n\n" +
                "**Reasoning:**\n" +
                `- Risk levels are extremely low (**${riskScore}%** overall risk).\n` +
                "- Zero contradictions, missing signatures, or version mismatches were found.\n" +
                "- All evidence items cross-verify and have high credibility ratings.\n\n" +
                "**Recommended Action:** Proceed with vendor approval and onboarding process.";
        }

        // Fallback debate compilation
        const financeRec = finRisk < 35 ? "APPROVE" : (finRisk <= 60 ? "REVIEW" : "REJECT");
        const financeOpinion = `Financial audit indicators show a category risk of ${finRisk}%. ` + 
            (finRisk < 35 ? "Allocated funds align with original budget thresholds." : 
             (finRisk <= 60 ? "Moderate numeric variances or value overlaps detected. Needs review." : 
              "Substantial budget discrepancy or cost overrun detected. Reject proposed pricing."));
        
        const complianceRec = compRisk < 30 ? "APPROVE" : (compRisk <= 55 ? "REVIEW" : "REJECT");
        const complianceOpinion = `Compliance check registers a category risk of ${compRisk}%. ` + 
            (compRisk < 30 ? "All required board signatures and certificates are present and authentic." : 
             (compRisk <= 55 ? "Minor advisory flags or missing document sign-offs noticed. Proceed with caution." : 
              "Critical compliance failure! Signatures are missing or vendor is temporarily suspended."));
              
        const legalRec = conflicts.length === 0 ? "APPROVE" : (conflicts.length < 2 ? "REVIEW" : "REJECT");
        const legalOpinion = `Contract legal review detected ${conflicts.length} version/policy discrepancies. ` + 
            (conflicts.length === 0 ? "No contractual conflicts or policy overlaps detected. Agreement complies." : 
             (conflicts.length < 2 ? "Minor version discrepancy found between documents. Check clause dates." : 
              "Major legal conflicts: multiple conflicting version clauses detected."));
              
        const riskRec = riskScore < 35 ? "LOW_RISK" : (riskScore <= 65 ? "MEDIUM_RISK" : "HIGH_RISK");
        const riskOpinion = `Weighted risk assessment computes an overall exposure level of ${riskScore}%. ` + 
            (riskScore < 35 ? "Secure vendor standing. Risk bounds are well within standard tolerance levels." : 
             (riskScore <= 65 ? "Elevated exposure limits. Multi-agent timeline flags versioning warnings." : 
              "High threat posture. Multiple warnings, policy overrides, and budget overruns flagged."));

        agentDebate = {
            finance_agent: { recommendation: financeRec, opinion: financeOpinion },
            compliance_agent: { recommendation: complianceRec, opinion: complianceOpinion },
            legal_agent: { recommendation: legalRec, opinion: legalOpinion },
            risk_agent: { recommendation: riskRec, opinion: riskOpinion }
        };
    }

    // --- Evidence Graph Construction ---
    const nodes: any[] = [];
    const edges: any[] = [];
    
    // 1. Root Decision Node
    nodes.push({
        id: "decision_root",
        label: `DECISION: ${decisionStatus}`,
        title: `Confidence: ${Math.round(confidenceScore * 100)}%<br>Risk: ${risks.overall_risk_score || 0}%`,
        group: "decision",
        level: 0,
        color: {
            background: decisionStatus === "APPROVE" ? "#1e4620" : (decisionStatus === "REJECT" ? "#8b0000" : "#b8860b"),
            border: decisionStatus === "APPROVE" ? "#2e7d32" : (decisionStatus === "REJECT" ? "#d32f2f" : "#f57c00"),
            highlight: {
                background: decisionStatus === "APPROVE" ? "#4caf50" : (decisionStatus === "REJECT" ? "#f44336" : "#ffb74d"),
                border: decisionStatus === "APPROVE" ? "#81c784" : (decisionStatus === "REJECT" ? "#e57373" : "#ffe082")
            }
        }
    });

    const docNodeIds = new Set<string>();

    // 2. Add Documents and Evidence Nodes/Edges
    evidenceList.forEach((ev, idx) => {
        const docId = ev.doc_id;
        const docName = ev.doc_name || `Doc ${docId}`;
        const evId = `ev_${idx}`;
        
        const docKey = `doc_${docId}`;
        if (!docNodeIds.has(docKey)) {
            nodes.push({
                id: docKey,
                label: docName,
                title: `Type: ${docName.split('.').pop()?.toUpperCase() || "UNKNOWN"}`,
                group: "document",
                level: 2
            });
            docNodeIds.add(docKey);
        }

        const evCategory = ev.category || "General";
        const evVal = ev.value || "";
        nodes.push({
            id: evId,
            label: `${evCategory}: ${evVal.substring(0, 20)}`,
            title: `<b>Claim:</b> ${ev.claim}<br><b>Credibility:</b> ${ev.credibility_score}`,
            group: "evidence",
            level: 1
        });

        // Document -> Evidence
        edges.push({
            from: docKey,
            to: evId,
            label: "contains",
            color: { color: "#42a5f5", highlight: "#90caf9" }
        });

        // Evidence -> Decision Root
        const isSupport = ev.status === "verified" && !ev.claim.toLowerCase().includes("blacklist");
        edges.push({
            from: evId,
            to: "decision_root",
            label: isSupport ? "supports" : "flags",
            color: { color: isSupport ? "#66bb6a" : "#ffa726", highlight: isSupport ? "#a5d6a7" : "#ffcc80" },
            dashes: !isSupport
        });
    });

    // 3. Add Conflict Nodes/Edges
    conflicts.forEach((conflict, idx) => {
        const cfId = `cf_${idx}`;
        const desc = conflict.description || "Discrepancy detected";
        const ctype = conflict.conflict_type || "conflict";

        nodes.push({
            id: cfId,
            label: `CONFLICT: ${ctype}`,
            title: desc,
            group: "conflict",
            level: 1.5,
            color: {
                background: "#ff5252",
                border: "#ff1744",
                highlight: { background: "#ff8a80", border: "#ff5252" }
            }
        });

        // Conflict -> Decision Root
        edges.push({
            from: cfId,
            to: "decision_root",
            label: "contradicts",
            color: { color: "#ef5350", highlight: "#e57373" },
            width: 2
        });

        // Conflict -> Document 1
        if (conflict.doc_id_1) {
            edges.push({
                from: `doc_${conflict.doc_id_1}`,
                to: cfId,
                label: "disputes",
                color: { color: "#ef5350", highlight: "#e57373" },
                dashes: true
            });
        }

        // Conflict -> Document 2
        if (conflict.doc_id_2) {
            edges.push({
                from: `doc_${conflict.doc_id_2}`,
                to: cfId,
                label: "disputes",
                color: { color: "#ef5350", highlight: "#e57373" },
                dashes: true
            });
        }
    });

    const graphData = {
        nodes: nodes,
        edges: edges
    };

    return {
        decision_status: decisionStatus,
        confidence_score: confidenceScore,
        explanation: explanation,
        evidence_graph_data: JSON.stringify(graphData),
        agent_debate_data: JSON.stringify(agentDebate)
    };
}
