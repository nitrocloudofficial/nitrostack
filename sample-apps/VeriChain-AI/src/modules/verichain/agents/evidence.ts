import fs from 'fs';
import path from 'path';
import { callLlm } from '../utils/llm-helper.js';

// Lazy imports/require to avoid errors if packages are still installing
let pdfParse: any;
let mammoth: any;
let XLSX: any;

async function loadParsers() {
    if (!pdfParse) {
        try {
            pdfParse = (await import('pdf-parse')).default;
        } catch (e) {
            console.warn('pdf-parse not loaded:', e);
        }
    }
    if (!mammoth) {
        try {
            mammoth = await import('mammoth');
        } catch (e) {
            console.warn('mammoth not loaded:', e);
        }
    }
    if (!XLSX) {
        try {
            XLSX = await import('xlsx');
        } catch (e) {
            console.warn('xlsx not loaded:', e);
        }
    }
}

export interface EvidenceItem {
    doc_id: number;
    doc_name: string;
    entity: string;
    claim: string;
    category: string;
    value?: string | null;
    credibility_score: number;
    source_location?: string | null;
    status: string;
}

export async function parseDocument(filePath: string, fileType: string): Promise<string> {
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return "";
    }

    const ext = path.extname(filePath).toLowerCase();
    let textContent = "";

    await loadParsers();

    try {
        if (ext === ".pdf") {
            if (pdfParse) {
                const dataBuffer = fs.readFileSync(filePath);
                const data = await pdfParse(dataBuffer);
                textContent = data.text || "";
            } else {
                throw new Error("pdf-parse library is not loaded");
            }
        } else if (ext === ".docx") {
            if (mammoth) {
                const result = await mammoth.extractRawText({ path: filePath });
                textContent = result.value || "";
            } else {
                throw new Error("mammoth library is not loaded");
            }
        } else if (ext === ".csv" || ext === ".xlsx") {
            if (XLSX) {
                const workbook = XLSX.readFile(filePath);
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                textContent = XLSX.utils.sheet_to_txt(sheet) || "";
            } else {
                throw new Error("xlsx library is not loaded");
            }
        } else if ([".txt", ".md"].includes(ext)) {
            textContent = fs.readFileSync(filePath, "utf-8");
        } else {
            console.warn(`Unsupported parser extension: ${ext}. Reading as raw text.`);
            textContent = fs.readFileSync(filePath, "utf-8");
        }
    } catch (e: any) {
        console.error(`Error parsing document ${filePath}:`, e);
        textContent = `Error parsing document: ${e.message || String(e)}`;
    }

    return textContent;
}

export async function runEvidenceExtractor(
    document: { id: number; filename: string; file_path: string; file_type: string },
    plan: { focus_categories?: string[] }
): Promise<EvidenceItem[]> {
    const filePath = document.file_path;
    const fileType = document.file_type;
    const filename = document.filename;
    const docId = document.id;

    console.log(`Extracting evidence from document: ${filename} (ID: ${docId})`);

    // Parse file content
    const content = await parseDocument(filePath, fileType);
    if (!content || content.trim() === "") {
        console.warn(`No content extracted from ${filename}.`);
        return [];
    }

    // Crop content if too long for LLM context window
    const truncatedContent = content.substring(0, 8000);

    const systemPrompt = 
        "You are an expert Evidence Extractor Agent. Your job is to analyze document text " +
        "and extract specific evidence claims relevant to the verification plan.\n" +
        "For each claim, identify:\n" +
        "- entity: The subject of the claim (e.g. Budget, Compliance, Signatory name).\n" +
        "- claim: A direct summary sentence of what is stated in the document.\n" +
        "- category: The class of claim ('Budget', 'Compliance', 'Legal', 'Policy', 'Date', 'General').\n" +
        "- value: The key extraction (e.g., 'Approved', 'Outdated', '$500,000').\n" +
        "- credibility_score: Score between 0.0 and 1.0 based on document clarity/official status.\n" +
        "- source_location: Location reference (e.g. 'Page 3, Section 4.2').\n" +
        "Respond ONLY with a JSON list of objects containing these fields. No explanations.";

    const userPrompt = JSON.stringify({
        plan: plan,
        filename: filename,
        content_sample: truncatedContent
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
            const evidenceList = JSON.parse(cleanedRes.trim()) as any[];
            
            // Append metadata
            const items: EvidenceItem[] = evidenceList.map(ev => ({
                doc_id: docId,
                doc_name: filename,
                entity: ev.entity || "Unknown",
                claim: ev.claim || "",
                category: ev.category || "General",
                value: ev.value !== undefined ? String(ev.value) : null,
                credibility_score: ev.credibility_score !== undefined ? Number(ev.credibility_score) : 1.0,
                source_location: ev.source_location || null,
                status: "verified"
            }));
            
            console.log(`Evidence Agent extracted ${items.length} items via LLM.`);
            return items;
        } catch (e) {
            console.error(`Failed to parse LLM evidence: ${e}. Falling back to heuristics.`);
        }
    }

    // Rule-based heuristics fallback
    console.log("Evidence Agent fallback heuristics triggered.");
    const evidenceList: EvidenceItem[] = [];

    // 1. Budget extraction heuristics
    const budgetRegex = /(budget|cost|total|price|allocation|approved value|amount)\s*(is|of|amounted to|allocated|for)?\s*(?:usd|\$)\s*([\d,]+)/gi;
    let match;
    let count = 0;
    while ((match = budgetRegex.exec(content)) !== null && count < 3) {
        const itemName = match[1];
        const amount = match[3];
        evidenceList.push({
            doc_id: docId,
            doc_name: filename,
            entity: `Budget (${itemName.trim()})`,
            claim: `Document specifies a budget of $${amount} for ${filename}.`,
            category: "Budget",
            value: `$${amount}`,
            credibility_score: 0.85,
            source_location: "Derived text match",
            status: "verified"
        });
        count++;
    }

    // 2. Compliance and Signature checks
    const complianceKeywords = ["comply", "compliant", "standard", "certified", "certify", "signed", "approved by", "signature", "policy"];
    for (const keyword of complianceKeywords) {
        const pattern = new RegExp(`([^.]{0,60}${keyword}[^.]{0,60})`, 'gi');
        const matches = content.match(pattern);
        if (matches) {
            for (const m of matches.slice(0, 2)) {
                const claimText = m.trim() + ".";
                evidenceList.push({
                    doc_id: docId,
                    doc_name: filename,
                    entity: `Compliance (${keyword.charAt(0).toUpperCase() + keyword.slice(1)})`,
                    claim: claimText,
                    category: (keyword !== "signature" && keyword !== "signed") ? "Compliance" : "Legal",
                    value: ["comply", "compliant", "standard"].includes(keyword) ? "Compliant" : "Signed/Approved",
                    credibility_score: 0.8,
                    source_location: "Heuristic match",
                    status: "verified"
                });
            }
        }
    }

    // 3. Dates and versioning checks
    const dateRegex = /(date|version|revised|updated|effective|expires)\s*:\s*([\w/\d\s,-]+)/gi;
    count = 0;
    while ((match = dateRegex.exec(content)) !== null && count < 3) {
        const key = match[1];
        const val = match[2];
        evidenceList.push({
            doc_id: docId,
            doc_name: filename,
            entity: key.trim().charAt(0).toUpperCase() + key.trim().slice(1),
            claim: `${key.trim().charAt(0).toUpperCase() + key.trim().slice(1)} of document is ${val.trim()}.`,
            category: "Date",
            value: val.trim(),
            credibility_score: 0.9,
            source_location: "Header heuristic",
            status: "verified"
        });
        count++;
    }

    // Fallback item if nothing found
    if (evidenceList.length === 0) {
        evidenceList.push({
            doc_id: docId,
            doc_name: filename,
            entity: "Document Metadata",
            claim: `Document ${filename} was successfully uploaded and registered.`,
            category: "General",
            value: "Active",
            credibility_score: 0.7,
            source_location: "System registry",
            status: "verified"
        });
    }

    console.log(`Evidence Agent extracted ${evidenceList.length} items via heuristics.`);
    return evidenceList;
}
