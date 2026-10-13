import express, { Response } from 'express';
import { db } from '../database/connection.js';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth.js';
import { orchestrateDecisionFlow } from '../../src/modules/verichain/services/agent-orchestrator.js';

const router = express.Router();

async function runAgentFlow(userId: number, query: string, docIds: number[]) {
    // Retrieve system settings and inject them into process.env
    const settingKeys = [
        'openai_api_key',
        'openai_api_base',
        'openai_model',
        'confidence_threshold',
        'risk_multiplier'
    ];
    
    for (const key of settingKeys) {
        try {
            const row = await db.get<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
            if (row) {
                process.env[key.toUpperCase()] = row.value;
            }
        } catch (err: any) {
            console.error(`Failed to read setting ${key}:`, err.message);
        }
    }

    // Retrieve documents
    const documents: any[] = [];
    for (const dId of docIds) {
        const doc = await db.get('SELECT * FROM uploaded_documents WHERE id = ?', [dId]);
        if (!doc) {
            throw new Error(`Document ID ${dId} not found.`);
        }
        documents.push(doc);
    }

    // Run direct TypeScript orchestration flow!
    const decision = await orchestrateDecisionFlow(userId, query, documents);

    return {
        success: true,
        decision_id: decision.id,
        status: decision.decision_status,
        confidence: decision.confidence_score
    };
}

// POST /agents/verify
router.post('/verify', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    const { query, document_ids } = req.body;

    if (!query || !document_ids || !Array.isArray(document_ids) || document_ids.length === 0) {
        return res.status(400).json({ detail: 'You must specify a query and at least one document ID for verification.' });
    }

    try {
        const parsedDocIds = document_ids.map(Number);
        
        // Validate that documents exist in database
        for (const docId of parsedDocIds) {
            const doc = await db.get('SELECT id FROM uploaded_documents WHERE id = ?', [docId]);
            if (!doc) {
                return res.status(404).json({ detail: `Document with ID ${docId} not found.` });
            }
        }

        console.log(`User ${req.user.username} triggered verification: '${query}' on documents: ${parsedDocIds}`);
        
        // Execute TS Agent Orchestrator directly
        const agentResult = await runAgentFlow(req.user.id, query, parsedDocIds);
        const decisionId = agentResult.decision_id;

        // Fetch the created decision details
        const decision = await db.get<any>('SELECT * FROM decisions WHERE id = ?', [decisionId]);
        if (!decision) {
            return res.status(500).json({ detail: 'Decision record was not found after execution.' });
        }

        // Fetch conflicts, logs and all evidence
        const conflicts = await db.all<any>('SELECT * FROM conflicts WHERE decision_id = ?', [decisionId]);
        const evidence = await db.all<any>('SELECT * FROM evidence');
        const agentLogs = await db.all<any>('SELECT * FROM agent_logs WHERE decision_id = ? ORDER BY created_at ASC', [decisionId]);

        // Map logs response
        const mappedLogs = agentLogs.map(log => ({
            agent_name: log.agent_name,
            log_message: log.log_message,
            status: log.status,
            created_at: log.created_at
        }));

        // Log audit
        await db.run(
            'INSERT INTO audit_logs (user_id, action, created_at) VALUES (?, ?, ?)',
            [req.user.id, `Completed verification decision: ID ${decisionId}`, new Date().toISOString()]
        );

        let debateData = {};
        try {
            debateData = JSON.parse(decision.agent_debate_data || '{}');
        } catch (e) {
            debateData = {};
        }

        return res.json({
            id: decision.id,
            query: decision.query,
            decision_status: decision.decision_status,
            confidence_score: decision.confidence_score,
            explanation: decision.explanation,
            evidence_graph_data: decision.evidence_graph_data,
            agent_debate_data: debateData,
            created_at: decision.created_at,
            agent_logs: mappedLogs,
            evidence: evidence.map(ev => ({
                id: ev.id,
                doc_id: ev.doc_id,
                entity: ev.entity,
                claim: ev.claim,
                category: ev.category,
                value: ev.value,
                credibility_score: ev.credibility_score,
                source_location: ev.source_location,
                status: ev.status
            })),
            conflicts: conflicts.map(c => ({
                id: c.id,
                doc_id_1: c.doc_id_1,
                doc_id_2: c.doc_id_2,
                description: c.description,
                severity: c.severity,
                conflict_type: c.conflict_type,
                status: c.status
            }))
        });

    } catch (err: any) {
        console.error('Error running agent workflow route:', err.message);
        return res.status(500).json({ detail: `Verification workflow execution failed: ${err.message}` });
    }
});

export default router;
