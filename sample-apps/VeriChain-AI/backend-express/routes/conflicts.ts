import express, { Response } from 'express';
import { db } from '../database/connection.js';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth.js';

const router = express.Router();

// GET /conflicts
router.get('/', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const conflicts = await db.all<any>('SELECT * FROM conflicts ORDER BY created_at DESC');
        return res.json(conflicts.map(c => ({
            id: c.id,
            decision_id: c.decision_id,
            doc_id_1: c.doc_id_1,
            doc_id_2: c.doc_id_2,
            description: c.description,
            severity: c.severity,
            conflict_type: c.conflict_type,
            status: c.status,
            created_at: c.created_at
        })));
    } catch (err: any) {
        console.error('Failed to get conflicts:', err.message);
        return res.status(500).json({ detail: 'Failed to retrieve conflicts list' });
    }
});

// GET /conflicts/decision/:decision_id
router.get('/decision/:decision_id', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    const decisionId = req.params.decision_id;
    try {
        const conflicts = await db.all<any>('SELECT * FROM conflicts WHERE decision_id = ? ORDER BY created_at DESC', [decisionId]);
        return res.json(conflicts.map(c => ({
            id: c.id,
            decision_id: c.decision_id,
            doc_id_1: c.doc_id_1,
            doc_id_2: c.doc_id_2,
            description: c.description,
            severity: c.severity,
            conflict_type: c.conflict_type,
            status: c.status,
            created_at: c.created_at
        })));
    } catch (err: any) {
        console.error(`Failed to get conflicts for decision ${decisionId}:`, err.message);
        return res.status(500).json({ detail: 'Failed to retrieve decision conflicts' });
    }
});

export default router;
