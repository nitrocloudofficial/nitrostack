import { 
    createDecision, 
    updateDecision,
    createAgentLog, 
    createEvidence, 
    createConflict, 
    Decision, 
    UploadedDocument 
} from '../database/db-helpers.js';

import { runPlanner } from '../agents/planner.js';
import { runEvidenceExtractor } from '../agents/evidence.js';
import { runVerification } from '../agents/verification.js';
import { runConflictDetection } from '../agents/conflict.js';
import { runRiskAnalysis } from '../agents/risk.js';
import { runDecisionAgent } from '../agents/decision.js';

export async function orchestrateDecisionFlow(
    userId: number | null,
    query: string,
    documents: UploadedDocument[]
): Promise<Decision> {
    console.log(`Starting orchestration flow for query: '${query}' on ${documents.length} documents`);

    // 1. Initialize processing decision record in DB to get an ID
    let dbDecision = await createDecision(
        userId,
        query,
        "PROCESSING",
        0.0,
        "Analyzing documents..."
    );

    const decisionId = dbDecision.id;
    console.log(`Initialized decision record. ID: ${decisionId}`);

    try {
        // --- 1. PLANNER ---
        await createAgentLog(decisionId, "Planner Agent", "Analyzing query and mapping document context.", "INFO");
        const docPayload = documents.map(d => ({
            id: d.id,
            filename: d.filename,
            file_type: d.file_type
        }));
        const plan = await runPlanner(query, docPayload);
        await createAgentLog(decisionId, "Planner Agent", `Planning complete. Selected primary focus categories: ${(plan.focus_categories || []).join(', ')}.`, "INFO");

        // --- 2. EVIDENCE EXTRACTION ---
        await createAgentLog(decisionId, "Evidence Agent", "Reading file streams and extracting facts/metadata.", "INFO");
        const primaryDocIds = plan.primary_document_ids || documents.map(d => d.id);
        const allEvidence: any[] = [];

        for (const doc of documents) {
            if (primaryDocIds.includes(doc.id)) {
                try {
                    await createAgentLog(decisionId, "Evidence Agent", `Parsing document: ${doc.filename}.`, "INFO");
                    const docEvidence = await runEvidenceExtractor(
                        { id: doc.id, filename: doc.filename, file_path: doc.file_path, file_type: doc.file_type },
                        plan
                    );
                    allEvidence.push(...docEvidence);
                } catch (e: any) {
                    await createAgentLog(decisionId, "Evidence Agent", `Failed to parse ${doc.filename}: ${e.message || String(e)}.`, "WARNING");
                }
            }
        }
        await createAgentLog(decisionId, "Evidence Agent", `Extraction complete. Found ${allEvidence.length} initial claims.`, "INFO");

        // --- 3. VERIFICATION ---
        await createAgentLog(decisionId, "Verification Agent", "Evaluating claim credibility and checking signature/source authenticity.", "INFO");
        const verifiedEvidence = await runVerification(allEvidence);

        // Save evidence registry items to database
        for (const ev of verifiedEvidence) {
            await createEvidence(
                ev.doc_id,
                ev.entity,
                ev.claim,
                ev.category,
                ev.value,
                ev.credibility_score,
                ev.source_location,
                ev.status
            );
        }
        await createAgentLog(decisionId, "Verification Agent", "Verification scoring complete. Saved evidence references to registry.", "INFO");

        // --- 4. CONFLICT DETECTION ---
        await createAgentLog(decisionId, "Conflict Agent", "Comparing cross-document values for contradictions, overlaps, or policy violations.", "INFO");
        const conflicts = await runConflictDetection(verifiedEvidence);

        // Save conflicts to database
        for (const cf of conflicts) {
            await createConflict(
                decisionId,
                cf.doc_id_1,
                cf.doc_id_2,
                cf.description,
                cf.severity,
                cf.conflict_type,
                cf.status
            );
        }
        const logStatus = conflicts.length > 0 ? "WARNING" : "INFO";
        await createAgentLog(decisionId, "Conflict Agent", `Conflict check complete. Flagged ${conflicts.length} issues.`, logStatus);

        // --- 5. RISK ANALYSIS ---
        await createAgentLog(decisionId, "Risk Agent", "Computing Financial, Compliance, Operational, and Business Risk indicators.", "INFO");
        const risks = await runRiskAnalysis(verifiedEvidence, conflicts);
        await createAgentLog(decisionId, "Risk Agent", `Calculated Risk Level: ${risks.overall_risk_score}% (Financial: ${risks.financial_risk}%, Compliance: ${risks.compliance_risk}%, Operational: ${risks.operational_risk}%, Business: ${risks.business_risk}%).`, "INFO");

        // --- 6. DECISION SYNTHESIS ---
        await createAgentLog(decisionId, "Decision Agent", "Synthesizing evidence reports and rendering final recommendation.", "INFO");
        const decisionData = await runDecisionAgent(query, verifiedEvidence, conflicts, risks);

        // Update database decision record with final status
        dbDecision = await updateDecision(decisionId, {
            decision_status: decisionData.decision_status,
            confidence_score: decisionData.confidence_score,
            explanation: decisionData.explanation,
            evidence_graph_data: decisionData.evidence_graph_data,
            agent_debate_data: decisionData.agent_debate_data
        });

        await createAgentLog(decisionId, "Decision Agent", `Recommendation finalized: ${decisionData.decision_status} with ${Math.round(decisionData.confidence_score * 100)}% confidence score.`, "INFO");

        console.log(`Orchestration completed successfully for decision ID ${decisionId}`);
        return dbDecision;
    } catch (error: any) {
        console.error(`Orchestration failed for decision ID ${decisionId}:`, error);
        await createAgentLog(decisionId, "System", `Agent flow run encountered an error: ${error.message || String(error)}`, "ERROR");
        
        dbDecision = await updateDecision(decisionId, {
            decision_status: "REVIEW",
            confidence_score: 0.0,
            explanation: `Error during agent execution: ${error.message || String(error)}`
        });
        
        throw error;
    }
}
