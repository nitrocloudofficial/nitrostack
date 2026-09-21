import fs from 'fs';
import path from 'path';
import os from 'os';
import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import * as dbHelpers from './database/db-helpers.js';
import { runEvidenceExtractor, parseDocument } from './agents/evidence.js';
import { runVerification } from './agents/verification.js';
import { runConflictDetection } from './agents/conflict.js';
import { runRiskAnalysis } from './agents/risk.js';
import { runDecisionAgent } from './agents/decision.js';
import { generatePdfReport } from './services/pdf-generator.js';

// Schemas
const UploadDocumentSchema = z.object({
    file_name: z.string().describe("Target filename (e.g. 'contract.pdf')"),
    file_type: z.string().describe("MIME type of the file (e.g. 'application/pdf')"),
    file_content: z.string().describe("Base64-encoded string of the file (optionally with data URI prefix)")
});

const ExtractEvidenceSchema = z.object({
    doc_id: z.number().describe("Database ID of the registered document")
});

const VerifyDocumentSchema = z.object({
    doc_id: z.number().describe("Database ID of the registered document to verify")
});

const DecisionIdSchema = z.object({
    decision_id: z.number().describe("Database ID of the decision context")
});

// Helpers
function isSupportedFile(filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase();
    const supportedExts = ['pdf', 'docx', 'csv', 'xlsx', 'txt', 'md'];
    return supportedExts.includes(ext || '');
}

function decodeBase64File(content: string): Buffer {
    let cleanContent = content;
    const matches = content.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
        cleanContent = matches[2];
    }
    return Buffer.from(cleanContent, 'base64');
}

function getSafeFilepath(filename: string): string {
    const uploadDir = process.env.UPLOAD_DIR || 'uploads';
    const cwd = process.cwd();
    const isBackendExpress = cwd.endsWith('backend-express');
    let resolvedUploadDir = isBackendExpress 
        ? path.resolve(cwd, '..', uploadDir) 
        : path.resolve(cwd, uploadDir);

    try {
        if (!fs.existsSync(resolvedUploadDir)) {
            fs.mkdirSync(resolvedUploadDir, { recursive: true });
        }
    } catch (e: any) {
        resolvedUploadDir = path.join(os.tmpdir(), 'uploads');
        if (!fs.existsSync(resolvedUploadDir)) {
            fs.mkdirSync(resolvedUploadDir, { recursive: true });
        }
    }

    const safeName = path.basename(filename).replace(/[^\w\-\.]/g, '_');
    return path.join(resolvedUploadDir, safeName);
}

export class VerichainTools {

    @Tool({
        name: 'upload_document',
        description: 'Decodes and registers an uploaded document in the database.',
        inputSchema: UploadDocumentSchema
    })
    async uploadDocument(args: z.infer<typeof UploadDocumentSchema>, ctx: ExecutionContext) {
        ctx.logger.info(`MCP Tool 'upload_document' triggered for: ${args.file_name}`);

        if (!isSupportedFile(args.file_name)) {
            return "Error: Supported formats are PDF, DOCX, CSV, XLSX, MD, and TXT.";
        }

        const savePath = getSafeFilepath(args.file_name);

        try {
            const fileBytes = decodeBase64File(args.file_content);
            fs.writeFileSync(savePath, fileBytes);
            const fileSize = fileBytes.length;

            // Generate content preview
            const textPreview = await parseDocument(savePath, args.file_type);
            const previewSample = textPreview ? textPreview.substring(0, 1000) : null;

            // Get or create dummy user
            let users = await dbHelpers.getUsers(0, 1);
            let user = users[0];
            if (!user) {
                user = await dbHelpers.createUser("mcp_agent", "mcp@verichain.ai", "dummy_pass", "admin");
            }

            const doc = await dbHelpers.createDocument(
                user.id,
                args.file_name,
                savePath,
                args.file_type,
                fileSize,
                previewSample || undefined
            );

            await dbHelpers.createAuditLog(user.id, `MCP upload_document: ${args.file_name}`);

            return JSON.stringify({
                status: "success",
                document_id: doc.id,
                filename: doc.filename,
                bytes: fileSize
            }, null, 2);
        } catch (e: any) {
            ctx.logger.error(`MCP upload_document tool failed: ${e.message}`);
            return `Error uploading document: ${e.message}`;
        }
    }

    @Tool({
        name: 'extract_evidence',
        description: 'Extracts claims and facts from a registered document using LLM or heuristics.',
        inputSchema: ExtractEvidenceSchema
    })
    async extractEvidence(args: z.infer<typeof ExtractEvidenceSchema>, ctx: ExecutionContext) {
        ctx.logger.info(`MCP Tool 'extract_evidence' triggered for doc ID: ${args.doc_id}`);

        try {
            const doc = await dbHelpers.getDocumentById(args.doc_id);
            if (!doc) {
                return `Error: Document with ID ${args.doc_id} not found.`;
            }

            const mockPlan = { focus_categories: ["Budget", "Compliance", "Legal", "Policy"] };
            const docPayload = {
                id: doc.id,
                filename: doc.filename,
                file_path: doc.file_path,
                file_type: doc.file_type
            };

            const evidence = await runEvidenceExtractor(docPayload, mockPlan);

            // Save to DB
            for (const ev of evidence) {
                await dbHelpers.createEvidence(
                    doc.id,
                    ev.entity,
                    ev.claim,
                    ev.category,
                    ev.value,
                    ev.credibility_score,
                    ev.source_location,
                    "verified"
                );
            }

            return JSON.stringify(evidence, null, 2);
        } catch (e: any) {
            ctx.logger.error(`MCP extract_evidence tool failed: ${e.message}`);
            return `Error extracting evidence: ${e.message}`;
        }
    }

    @Tool({
        name: 'verify_document',
        description: 'Verifies evidence claims of a given document and assigns credibility scores.',
        inputSchema: VerifyDocumentSchema
    })
    async verifyDocument(args: z.infer<typeof VerifyDocumentSchema>, ctx: ExecutionContext) {
        ctx.logger.info(`MCP Tool 'verify_document' triggered for doc ID: ${args.doc_id}`);

        try {
            const doc = await dbHelpers.getDocumentById(args.doc_id);
            if (!doc) {
                return `Error: Document with ID ${args.doc_id} not found.`;
            }

            const evidence = await dbHelpers.getEvidenceByDoc(args.doc_id);
            const evidencePayload = evidence.map(ev => ({
                doc_id: ev.doc_id,
                doc_name: doc.filename,
                entity: ev.entity,
                claim: ev.claim,
                category: ev.category,
                value: ev.value,
                credibility_score: ev.credibility_score,
                source_location: ev.source_location,
                status: ev.status
            }));

            const verified = await runVerification(evidencePayload);

            // Update database
            await dbHelpers.deleteEvidenceByDoc(args.doc_id);
            for (const ev of verified) {
                await dbHelpers.createEvidence(
                    args.doc_id,
                    ev.entity,
                    ev.claim,
                    ev.category,
                    ev.value,
                    ev.credibility_score,
                    ev.source_location,
                    ev.status || "verified"
                );
            }

            return JSON.stringify(verified, null, 2);
        } catch (e: any) {
            ctx.logger.error(`MCP verify_document tool failed: ${e.message}`);
            return `Error verifying claims: ${e.message}`;
        }
    }

    @Tool({
        name: 'detect_conflicts',
        description: 'Scans and reports contradictions/outdated revisions for a decision context.',
        inputSchema: DecisionIdSchema
    })
    async detectConflicts(args: z.infer<typeof DecisionIdSchema>, ctx: ExecutionContext) {
        ctx.logger.info(`MCP Tool 'detect_conflicts' triggered for decision ID: ${args.decision_id}`);

        try {
            const evidence = await dbHelpers.getAllEvidence(0, 1000);
            const evidencePayload = await Promise.all(evidence.map(async (ev) => {
                const doc = await dbHelpers.getDocumentById(ev.doc_id);
                return {
                    doc_id: ev.doc_id,
                    doc_name: doc ? doc.filename : `Doc ${ev.doc_id}`,
                    entity: ev.entity,
                    claim: ev.claim,
                    category: ev.category,
                    value: ev.value,
                    credibility_score: ev.credibility_score,
                    source_location: ev.source_location,
                    status: ev.status
                };
            }));

            const conflicts = await runConflictDetection(evidencePayload);

            // Save detected conflicts to database
            for (const cf of conflicts) {
                await dbHelpers.createConflict(
                    args.decision_id,
                    cf.doc_id_1,
                    cf.doc_id_2,
                    cf.description,
                    cf.severity,
                    cf.conflict_type,
                    cf.status
                );
            }

            return JSON.stringify(conflicts, null, 2);
        } catch (e: any) {
            ctx.logger.error(`MCP detect_conflicts tool failed: ${e.message}`);
            return `Error detecting conflicts: ${e.message}`;
        }
    }

    @Tool({
        name: 'calculate_risk',
        description: 'Calculates multidimensional risk matrix based on current database evidence.',
        inputSchema: DecisionIdSchema
    })
    async calculateRisk(args: z.infer<typeof DecisionIdSchema>, ctx: ExecutionContext) {
        ctx.logger.info(`MCP Tool 'calculate_risk' triggered for decision ID: ${args.decision_id}`);

        try {
            const evidence = await dbHelpers.getAllEvidence(0, 1000);
            const evidencePayload = evidence.map(ev => ({
                doc_id: ev.doc_id,
                doc_name: `Doc ${ev.doc_id}`,
                entity: ev.entity,
                claim: ev.claim,
                category: ev.category,
                value: ev.value,
                credibility_score: ev.credibility_score,
                source_location: ev.source_location,
                status: ev.status
            }));

            const conflicts = await dbHelpers.getConflictsByDecision(args.decision_id);
            const conflictPayload = conflicts.map(c => ({
                doc_id_1: c.doc_id_1 || null,
                doc_id_2: c.doc_id_2 || null,
                description: c.description,
                severity: c.severity,
                conflict_type: c.conflict_type,
                status: c.status
            }));

            const risks = await runRiskAnalysis(evidencePayload, conflictPayload);
            return JSON.stringify(risks, null, 2);
        } catch (e: any) {
            ctx.logger.error(`MCP calculate_risk tool failed: ${e.message}`);
            return `Error calculating risk: ${e.message}`;
        }
    }

    @Tool({
        name: 'generate_decision',
        description: 'Compiles agent results and renders Approve/Reject recommendation status.',
        inputSchema: DecisionIdSchema
    })
    async generateDecision(args: z.infer<typeof DecisionIdSchema>, ctx: ExecutionContext) {
        ctx.logger.info(`MCP Tool 'generate_decision' triggered for decision ID: ${args.decision_id}`);

        try {
            const decision = await dbHelpers.getDecisionById(args.decision_id);
            if (!decision) {
                return `Error: Decision ID ${args.decision_id} not found.`;
            }

            const evidence = await dbHelpers.getAllEvidence(0, 1000);
            const evidencePayload = await Promise.all(evidence.map(async (ev) => {
                const doc = await dbHelpers.getDocumentById(ev.doc_id);
                return {
                    doc_id: ev.doc_id,
                    doc_name: doc ? doc.filename : `Doc ${ev.doc_id}`,
                    entity: ev.entity,
                    claim: ev.claim,
                    category: ev.category,
                    value: ev.value,
                    credibility_score: ev.credibility_score,
                    source_location: ev.source_location,
                    status: ev.status
                };
            }));

            const conflicts = await dbHelpers.getConflictsByDecision(args.decision_id);
            const conflictPayload = conflicts.map(c => ({
                doc_id_1: c.doc_id_1 || null,
                doc_id_2: c.doc_id_2 || null,
                description: c.description,
                severity: c.severity,
                conflict_type: c.conflict_type,
                status: c.status
            }));

            const risks = await runRiskAnalysis(evidencePayload, conflictPayload);
            const res = await runDecisionAgent(decision.query, evidencePayload, conflictPayload, risks);

            // Update database
            await dbHelpers.updateDecision(args.decision_id, {
                decision_status: res.decision_status,
                confidence_score: res.confidence_score,
                explanation: res.explanation,
                evidence_graph_data: res.evidence_graph_data,
                agent_debate_data: res.agent_debate_data
            });

            return JSON.stringify(res, null, 2);
        } catch (e: any) {
            ctx.logger.error(`MCP generate_decision tool failed: ${e.message}`);
            return `Error generating decision: ${e.message}`;
        }
    }

    @Tool({
        name: 'generate_report',
        description: 'Assembles all document evidence and risk analyses into a PDF report file.',
        inputSchema: DecisionIdSchema
    })
    async generateReport(args: z.infer<typeof DecisionIdSchema>, ctx: ExecutionContext) {
        ctx.logger.info(`MCP Tool 'generate_report' triggered for decision ID: ${args.decision_id}`);

        try {
            const decision = await dbHelpers.getDecisionById(args.decision_id);
            if (!decision) {
                return `Error: Decision ID ${args.decision_id} not found.`;
            }

            const evidence = await dbHelpers.getAllEvidence(0, 1000);
            const conflicts = await dbHelpers.getConflictsByDecision(args.decision_id);

            const evidencePayload = evidence.map(ev => ({
                doc_id: ev.doc_id,
                doc_name: `Doc ${ev.doc_id}`,
                entity: ev.entity,
                claim: ev.claim,
                category: ev.category,
                value: ev.value,
                credibility_score: ev.credibility_score,
                source_location: ev.source_location,
                status: ev.status
            }));
            
            const conflictPayload = conflicts.map(c => ({
                doc_id_1: c.doc_id_1 || null,
                doc_id_2: c.doc_id_2 || null,
                description: c.description,
                severity: c.severity,
                conflict_type: c.conflict_type,
                status: c.status
            }));

            const risks = await runRiskAnalysis(evidencePayload, conflictPayload);

            const pdfPath = await generatePdfReport(decision, evidence, conflicts, risks);
            const report = await dbHelpers.createReport(args.decision_id, pdfPath, "PDF");

            return JSON.stringify({
                status: "success",
                report_id: report.id,
                pdf_path: pdfPath
            }, null, 2);
        } catch (e: any) {
            ctx.logger.error(`MCP generate_report tool failed: ${e.message}`);
            return `Error generating report: ${e.message}`;
        }
    }

    @Tool({
        name: 'export_pdf',
        description: 'Returns the absolute file path of the generated PDF evidence audit report.',
        inputSchema: DecisionIdSchema
    })
    async exportPdf(args: z.infer<typeof DecisionIdSchema>, ctx: ExecutionContext) {
        try {
            const reports = await dbHelpers.getReportsByDecision(args.decision_id);
            const pdf = reports.find(r => r.format.toUpperCase() === "PDF");
            if (pdf && fs.existsSync(pdf.file_path)) {
                return pdf.file_path;
            }
            return `Error: PDF report not found for Decision ID ${args.decision_id}. Run generate_report first.`;
        } catch (e: any) {
            return `Error fetching report: ${e.message}`;
        }
    }

    @Tool({
        name: 'export_json',
        description: 'Exports complete decision audit data structure as a JSON formatted string.',
        inputSchema: DecisionIdSchema
    })
    async exportJson(args: z.infer<typeof DecisionIdSchema>, ctx: ExecutionContext) {
        try {
            const decision = await dbHelpers.getDecisionById(args.decision_id);
            if (!decision) {
                return `Error: Decision ${args.decision_id} not found.`;
            }

            const conflicts = await dbHelpers.getConflictsByDecision(args.decision_id);
            const evidence = await dbHelpers.getAllEvidence(0, 1000);

            const evidencePayload = evidence.map(ev => ({
                doc_id: ev.doc_id,
                doc_name: `Doc ${ev.doc_id}`,
                entity: ev.entity,
                claim: ev.claim,
                category: ev.category,
                value: ev.value,
                credibility_score: ev.credibility_score,
                source_location: ev.source_location,
                status: ev.status
            }));
            
            const conflictPayload = conflicts.map(c => ({
                doc_id_1: c.doc_id_1 || null,
                doc_id_2: c.doc_id_2 || null,
                description: c.description,
                severity: c.severity,
                conflict_type: c.conflict_type,
                status: c.status
            }));

            const risks = await runRiskAnalysis(evidencePayload, conflictPayload);

            const payload = {
                decision_id: decision.id,
                query: decision.query,
                recommendation: decision.decision_status,
                confidence: decision.confidence_score,
                explanation: decision.explanation,
                risks: risks,
                conflicts: conflicts.map(c => ({ description: c.description, severity: c.severity }))
            };
            return JSON.stringify(payload, null, 2);
        } catch (e: any) {
            return `Error exporting JSON: ${e.message}`;
        }
    }

    @Tool({
        name: 'export_html',
        description: 'Exports printable HTML verification report for user web presentation.',
        inputSchema: DecisionIdSchema
    })
    async exportHtml(args: z.infer<typeof DecisionIdSchema>, ctx: ExecutionContext) {
        try {
            const decision = await dbHelpers.getDecisionById(args.decision_id);
            if (!decision) {
                return `Error: Decision ${args.decision_id} not found.`;
            }

            const evidence = await dbHelpers.getAllEvidence(0, 1000);
            const conflicts = await dbHelpers.getConflictsByDecision(args.decision_id);

            const evidenceLi = evidence.map(ev => 
                `<li><b>${ev.entity}</b> (${ev.category}): ${ev.claim} (Credibility: ${Math.round(ev.credibility_score * 100)}%)</li>`
            ).join('');
            
            const conflictLi = conflicts.map(c => 
                `<li style='color:red;'><b>${c.conflict_type} (${c.severity})</b>: ${c.description}</li>`
            ).join('') || "<li>No conflicts detected.</li>";

            const html = `
        <html>
        <head><title>VeriChain Report #${decision.id}</title></head>
        <body style='font-family:sans-serif; margin:40px;'>
          <h1>VeriChain AI Audit Report</h1>
          <h3>Query: ${decision.query}</h3>
          <h2>Recommendation: ${decision.decision_status} (Confidence: ${Math.round(decision.confidence_score * 100)}%)</h2>
          <hr/>
          <h3>Verified Evidence</h3>
          <ul>${evidenceLi}</ul>
          <h3>Detected Conflicts</h3>
          <ul>${conflictLi}</ul>
        </body>
        </html>
        `;
            return html;
        } catch (e: any) {
            return `Error exporting HTML: ${e.message}`;
        }
    }
}
