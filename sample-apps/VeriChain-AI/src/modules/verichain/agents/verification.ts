import { callLlm } from '../utils/llm-helper.js';
import { EvidenceItem } from './evidence.js';

export async function runVerification(evidenceList: EvidenceItem[]): Promise<EvidenceItem[]> {
    console.log(`Running Verification Agent on ${evidenceList.length} evidence claims.`);
    
    if (evidenceList.length === 0) {
        return [];
    }

    const systemPrompt = 
        "You are an expert Verification Agent in an enterprise AI system.\n" +
        "Your task is to analyze a list of extracted evidence claims, verify their credibility, " +
        "and determine if their status is verified, unverified, or contradictory.\n" +
        "Verify if documents cross-check and calculate an updated 'credibility_score' based on:\n" +
        "1. Specificity of claims.\n" +
        "2. Source metadata (official documents score higher than loose txt files).\n" +
        "3. Correlation/support between claims.\n" +
        "Respond ONLY with a JSON list of updated evidence objects, matching the exact input structure " +
        "but adding or updating: 'status' (verified, unverified, contradictory) and 'credibility_score' (0.0 to 1.0).";

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
            const verifiedList = JSON.parse(cleanedRes.trim()) as any[];
            console.log(`Verification Agent updated ${verifiedList.length} claims via LLM.`);
            
            return verifiedList.map((ev, idx) => {
                const original = evidenceList[idx] || {};
                return {
                    doc_id: ev.doc_id !== undefined ? Number(ev.doc_id) : original.doc_id,
                    doc_name: ev.doc_name || original.doc_name || "",
                    entity: ev.entity || original.entity || "Unknown",
                    claim: ev.claim || original.claim || "",
                    category: ev.category || original.category || "General",
                    value: ev.value !== undefined ? String(ev.value) : original.value,
                    credibility_score: ev.credibility_score !== undefined ? Number(ev.credibility_score) : (original.credibility_score || 1.0),
                    source_location: ev.source_location || original.source_location,
                    status: ev.status || original.status || "verified"
                };
            });
        } catch (e) {
            console.error(`Failed to parse LLM verification: ${e}. Falling back to heuristics.`);
        }
    }

    // Rule-based heuristics fallback
    console.log("Verification Agent fallback heuristics triggered.");
    const verifiedList: EvidenceItem[] = [];

    for (const ev of evidenceList) {
        const updatedEv = { ...ev };
        const docName = ev.doc_name || "";
        
        // Determine base credibility based on file type
        let baseScore = ev.credibility_score !== undefined ? ev.credibility_score : 0.8;
        if (docName.toLowerCase().endsWith(".txt")) {
            baseScore = Math.max(0.5, baseScore - 0.15);
        } else if (docName.toLowerCase().endsWith(".pdf")) {
            baseScore = Math.min(0.95, baseScore + 0.1);
        } else if (docName.toLowerCase().endsWith(".xlsx") || docName.toLowerCase().endsWith(".csv")) {
            baseScore = Math.min(0.9, baseScore + 0.05);
        }
        
        updatedEv.credibility_score = Math.round(baseScore * 100) / 100;
        updatedEv.status = "verified";
        verifiedList.push(updatedEv);
    }

    console.log("Verification Agent complete.");
    return verifiedList;
}
