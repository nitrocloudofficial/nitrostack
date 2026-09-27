import { callLlm } from '../utils/llm-helper.js';

export interface PlannerResult {
    target_entity: string;
    verification_steps: string[];
    primary_document_ids: number[];
    focus_categories: string[];
}

export async function runPlanner(
    query: string, 
    documents: Array<{ id: number; filename: string; file_type: string }>
): Promise<PlannerResult> {
    console.log(`Running Planner Agent on query: '${query}' with ${documents.length} documents.`);
    
    const systemPrompt = 
        "You are an expert Planning Agent in a multi-agent evidence verification platform.\n" +
        "Your task is to analyze the user's query and a list of available files, then " +
        "formulate a step-by-step verification plan. The plan should define:\n" +
        "1. Targeted entities to extract (e.g. Vendor, Budget amount, Signatories).\n" +
        "2. Required verification checks (e.g. cross-checking dates, compliance standards).\n" +
        "3. Expected resources/categories of interest.\n" +
        "Respond ONLY with a JSON object. No markdown, no explanations outside the JSON.";
    
    const docSummary = documents.map(doc => ({ id: doc.id, filename: doc.filename, type: doc.file_type }));
    
    const userPrompt = JSON.stringify({
        query: query,
        available_documents: docSummary
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
            const plan = JSON.parse(cleanedRes.trim());
            console.log("Planner Agent executed successfully via LLM.");
            return plan as PlannerResult;
        } catch (e) {
            console.error(`Failed to parse LLM response for Planner: ${e}. Falling back to heuristics.`);
        }
    }

    // Rule-based fallback heuristics
    console.log("Planner Agent fallback heuristics triggered.");
    
    let targetEntity = "Unknown Vendor";
    const words = query.split(/\s+/);
    for (const word of words) {
        if (word.length > 2 && word[0] === word[0].toUpperCase() && !["Should", "We", "Approve", "Vendor", "The", "What", "Who", "How"].includes(word)) {
            targetEntity = word.replace(/[?,.!]/g, "");
            break;
        }
    }
    
    const tasks = [
        `Identify and extract key information regarding ${targetEntity} from all documents.`,
        "Check signatory compliance and date authenticity.",
        "Verify budget allocations and match numeric thresholds.",
        "Detect any policy violations or historical vendor complaints."
    ];
    
    const primaryDocs = documents.map(doc => doc.id);
    
    return {
        target_entity: targetEntity,
        verification_steps: tasks,
        primary_document_ids: primaryDocs,
        focus_categories: ["Budget", "Compliance", "Legal", "Policy", "Financials"]
    };
}
