import express, { Response } from 'express';
import { db } from '../database/connection.js';
import { authenticateUser, requireAdmin, AuthenticatedRequest } from '../middleware/auth.js';

const router = express.Router();

// GET /audit-logs
router.get('/', authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const logs = await db.all<any>(`
            SELECT a.id, a.user_id, a.action, a.ip_address, a.created_at, u.username
            FROM audit_logs a
            LEFT JOIN users u ON a.user_id = u.id
            ORDER BY a.created_at DESC
            LIMIT 200
        `);

        return res.json(logs.map(log => ({
            id: log.id,
            user_id: log.user_id,
            username: log.username || 'System/MCP',
            action: log.action,
            ip_address: log.ip_address,
            created_at: log.created_at
        })));
    } catch (err: any) {
        console.error('Failed to retrieve audit logs:', err.message);
        return res.status(500).json({ detail: 'Failed to retrieve system audit logs' });
    }
});

// GET /audit-logs/users (list registered users for Admin panel)
router.get('/users', authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const users = await db.all('SELECT id, username, email, role, created_at FROM users ORDER BY created_at ASC');
        return res.json(users);
    } catch (err: any) {
        console.error('Failed to retrieve system users:', err.message);
        return res.status(500).json({ detail: 'Failed to retrieve registered users' });
    }
});

// POST /audit-logs/users/:username/promote
router.post('/users/:username/promote', authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    const username = req.params.username;

    try {
        const user = await db.get<any>('SELECT * FROM users WHERE username = ?', [username]);
        if (!user) {
            return res.status(404).json({ detail: 'User not found' });
        }

        if (user.role === 'admin') {
            return res.status(400).json({ detail: 'User is already an administrator' });
        }

        const now = new Date().toISOString();
        await db.run("UPDATE users SET role = 'admin' WHERE username = ?", [username]);

        // Audit log action
        await db.run(
            'INSERT INTO audit_logs (user_id, action, created_at) VALUES (?, ?, ?)',
            [req.user.id, `Promoted user ${username} to admin`, now]
        );

        console.log(`User ${username} has been promoted to Admin by ${req.user.username}`);
        return res.json({ detail: `User '${username}' has been promoted to Admin.` });
    } catch (err: any) {
        console.error('Failed to promote user:', err.message);
        return res.status(500).json({ detail: 'Failed to promote user' });
    }
});

export default router;
