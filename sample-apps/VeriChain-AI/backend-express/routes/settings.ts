import express, { Response } from 'express';
import { db } from '../database/connection.js';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth.js';

const router = express.Router();

const SETTING_KEYS = [
    'openai_api_key',
    'openai_api_base',
    'openai_model',
    'confidence_threshold',
    'risk_multiplier'
];

const SETTING_DEFAULTS: Record<string, string> = {
    'openai_api_key': '',
    'openai_api_base': 'https://api.openai.com/v1',
    'openai_model': 'gpt-4o-mini',
    'confidence_threshold': '0.75',
    'risk_multiplier': '1.0'
};

// GET /settings
router.get('/', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const settings: Record<string, string> = {};
        for (const key of SETTING_KEYS) {
            const row = await db.get<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
            if (row) {
                settings[key] = row.value;
            } else {
                const envVal = process.env[key.toUpperCase()];
                settings[key] = envVal !== undefined ? envVal : SETTING_DEFAULTS[key];
            }
        }
        return res.json(settings);
    } catch (err: any) {
        console.error('Failed to retrieve settings:', err.message);
        return res.status(500).json({ detail: 'Failed to retrieve system settings' });
    }
});

// POST /settings
router.post('/', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    const config = req.body;

    try {
        const now = new Date().toISOString();
        
        for (const key of SETTING_KEYS) {
            if (config[key] !== undefined) {
                const value = String(config[key]);
                
                const existing = await db.get('SELECT id FROM settings WHERE key = ?', [key]);
                if (existing) {
                    await db.run('UPDATE settings SET value = ? WHERE key = ?', [value, key]);
                } else {
                    await db.run('INSERT INTO settings (key, value, created_at) VALUES (?, ?, ?)', [key, value, now]);
                }

                // Update Express process environment variables
                process.env[key.toUpperCase()] = value;
            }
        }

        // Log audit trail
        await db.run(
            'INSERT INTO audit_logs (user_id, action, created_at) VALUES (?, ?, ?)',
            [req.user.id, 'Updated system settings configuration', now]
        );

        console.log(`User ${req.user.username} successfully updated system settings.`);
        return res.json({ detail: 'System configurations successfully saved and updated.' });
    } catch (err: any) {
        console.error('Failed to save settings:', err.message);
        return res.status(500).json({ detail: 'Failed to update system settings' });
    }
});

export default router;
