import express, { Response } from 'express';
import { db } from '../database/connection.js';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth.js';

const router = express.Router();

// GET /decisions
router.get('/', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const decisions = await db.all<any>('SELECT * FROM decisions ORDER BY created_at DESC');
        return res.json(decisions.map(dec => ({
            id: dec.id,
            query: dec.query,
            decision_status: dec.decision_status,
            confidence_score: dec.confidence_score,
            created_at: dec.created_at
        })));
    } catch (err: any) {
        console.error('Failed to list decisions:', err.message);
        return res.status(500).json({ detail: 'Failed to retrieve decisions list' });
    }
});

// GET /decisions/:decision_id
router.get('/:decision_id', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    const decisionId = req.params.decision_id;

    try {
        const decision = await db.get<any>('SELECT * FROM decisions WHERE id = ?', [decisionId]);
        if (!decision) {
            return res.status(404).json({ detail: 'Decision not found' });
        }

        // Fetch conflicts, logs and all evidence
        const conflicts = await db.all<any>('SELECT * FROM conflicts WHERE decision_id = ?', [decisionId]);
        const agentLogs = await db.all<any>('SELECT * FROM agent_logs WHERE decision_id = ? ORDER BY created_at ASC', [decisionId]);
        const evidence = await db.all<any>('SELECT * FROM evidence');

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
            })),
            agent_logs: agentLogs.map(log => ({
                agent_name: log.agent_name,
                log_message: log.log_message,
                status: log.status,
                created_at: log.created_at
            }))
        });
    } catch (err: any) {
        console.error('Failed to get decision details:', err.message);
        return res.status(500).json({ detail: 'Failed to retrieve decision details' });
    }
});

export default router;
