import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import * as dbHelpers from './database/db-helpers.js';

export class VerichainResources {
    @Resource({
        uri: 'app://documents',
        name: 'Uploaded Documents',
        description: 'Returns a list of all uploaded documents in the database.',
        mimeType: 'application/json'
    })
    async getUploadedDocuments(uri: string, ctx: ExecutionContext): Promise<any> {
        ctx.logger.info("MCP Resource: Fetching uploaded documents list.");
        try {
            const docs = await dbHelpers.getDocuments(0, 100);
            const docsList = docs.map(doc => ({
                id: doc.id,
                filename: doc.filename,
                file_type: doc.file_type,
                file_size: doc.file_size,
                uploaded_at: doc.created_at
            }));
            return {
                type: 'text',
                data: JSON.stringify(docsList, null, 2)
            };
        } catch (err: any) {
            ctx.logger.error("Failed to fetch uploaded documents:", { error: err.message });
            return {
                type: 'text',
                data: JSON.stringify({ error: err.message })
            };
        }
    }

    @Resource({
        uri: 'app://decisions',
        name: 'Decision History',
        description: 'Returns the decision history log with recommendations and confidence scores.',
        mimeType: 'application/json'
    })
    async getDecisionHistory(uri: string, ctx: ExecutionContext): Promise<any> {
        ctx.logger.info("MCP Resource: Fetching decision history.");
        try {
            const decisions = await dbHelpers.getDecisions(0, 100);
            const history = decisions.map(dec => ({
                id: dec.id,
                query: dec.query,
                recommendation: dec.decision_status,
                confidence: dec.confidence_score,
                created_at: dec.created_at
            }));
            return {
                type: 'text',
                data: JSON.stringify(history, null, 2)
            };
        } catch (err: any) {
            ctx.logger.error("Failed to fetch decision history:", { error: err.message });
            return {
                type: 'text',
                data: JSON.stringify({ error: err.message })
            };
        }
    }

    @Resource({
        uri: 'app://policies',
        name: 'Corporate Policies',
        description: 'Returns corporate risk and signatory policy guidelines (static reference markdown).',
        mimeType: 'text/markdown'
    })
    async getCorporatePolicies(uri: string, ctx: ExecutionContext): Promise<any> {
        ctx.logger.info("MCP Resource: Fetching corporate policies.");
        const policyMd = 
            "# Corporate Verification & Onboarding Policies\n\n" +
            "## 1. Budget Authorization Thresholds\n" +
            "- Purchases under $100,000 USD require Department Head approval.\n" +
            "- Purchases between $100,000 and $500,000 USD require Board signature.\n" +
            "- Purchases exceeding $500,000 USD require CFO + CEO explicit approvals.\n\n" +
            "## 2. Signatory Compliance\n" +
            "- All vendor contracts must contain double signatures representing the " +
            "legal entity and the internal buying manager.\n" +
            "- Outdated document versions (mismatching effective dates) are strictly prohibited.\n\n" +
            "## 3. Blacklist Restrictions\n" +
            "- Any vendor referenced in audit logs as 'failed compliance' or 'rejected status' " +
            "must be routed to manual REVIEW. Automatic APPROVAL is prohibited.";
        return {
            type: 'text',
            data: policyMd
        };
    }

    @Resource({
        uri: 'app://templates',
        name: 'Report Templates',
        description: 'Returns standard executive report layouts (text representation).',
        mimeType: 'application/json'
    })
    async getReportTemplates(uri: string, ctx: ExecutionContext): Promise<any> {
        ctx.logger.info("MCP Resource: Fetching report templates.");
        const templateStructure = {
            report_structure: [
                "Executive Summary",
                "Multi-Dimensional Risk Matrix",
                "Verified Evidence Registry",
                "Detected Conflicts & Discrepancies",
                "Actionable Recommendations",
                "Next Steps Timeline"
            ]
        };
        return {
            type: 'text',
            data: JSON.stringify(templateStructure, null, 2)
        };
    }

    @Resource({
        uri: 'app://kb',
        name: 'Platform Knowledge Base',
        description: 'Returns static knowledge base concepts of the Evidence Intelligence Platform.',
        mimeType: 'text/markdown'
    })
    async getKnowledgeBase(uri: string, ctx: ExecutionContext): Promise<any> {
        ctx.logger.info("MCP Resource: Fetching knowledge base.");
        const kbMd = 
            "# VeriChain AI Knowledge Base\n\n" +
            "Traditional AI assistants answer questions immediately, creating blind spots. " +
            "VeriChain AI mitigates this by generating structured **Evidence Graphs** and cross-checking " +
            "conflicting numbers, signatory names, and dates across all uploaded corporate documents.";
        return {
            type: 'text',
            data: kbMd
        };
    }
}
