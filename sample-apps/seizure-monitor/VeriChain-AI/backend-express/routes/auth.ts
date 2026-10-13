import express, { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../database/connection.js';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth.js';

const router = express.Router();
const SECRET_KEY = process.env.SECRET_KEY || 'verichain_secure_secret_key_2026_hackathon_demo';

// Helper to create audit logs
async function createAuditLog(userId: number, action: string, ip: string | null = null) {
    try {
        await db.run(
            'INSERT INTO audit_logs (user_id, action, ip_address, created_at) VALUES (?, ?, ?, ?)',
            [userId, action, ip, new Date().toISOString()]
        );
    } catch (err: any) {
        console.error('Failed to create audit log:', err.message);
    }
}

// POST /auth/register
router.post('/register', async (req, res: Response) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ detail: 'Username, email and password are required' });
    }

    try {
        // Check if username or email exists
        const existingUser = await db.get('SELECT id FROM users WHERE username = ?', [username]);
        if (existingUser) {
            return res.status(400).json({ detail: 'Username already registered' });
        }

        const existingEmail = await db.get('SELECT id FROM users WHERE email = ?', [email]);
        if (existingEmail) {
            return res.status(400).json({ detail: 'Email already registered' });
        }

        // Check if this is the first user (make them admin)
        const userCountRow = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM users');
        const role = (!userCountRow || userCountRow.count === 0) ? 'admin' : 'user';

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const now = new Date().toISOString();
        const result = await db.run(
            'INSERT INTO users (username, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)',
            [username, email, hashedPassword, role, now]
        );

        const newUserId = result.lastID;
        console.log(`User ${username} registered with role ${role}.`);
        await createAuditLog(newUserId, `Registered account with role ${role}`);

        return res.status(201).json({
            id: newUserId,
            username,
            email,
            role
        });
    } catch (err: any) {
        console.error('Registration error:', err.message);
        return res.status(500).json({ detail: 'Internal server error during registration' });
    }
});

// POST /auth/login
router.post('/login', async (req, res: Response) => {
    const username = req.body.username;
    const password = req.body.password;

    if (!username || !password) {
        return res.status(400).json({ detail: 'Username and password are required' });
    }

    try {
        const user = await db.get<{ id: number, username: string, email: string, password_hash: string, role: string }>('SELECT * FROM users WHERE username = ?', [username]);
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ detail: 'Incorrect username or password' });
        }

        // Create access token
        const accessToken = jwt.sign({ sub: user.username }, SECRET_KEY, { expiresIn: '60m' });

        console.log(`User ${user.username} logged in successfully.`);
        await createAuditLog(user.id, 'Logged in successfully');

        return res.json({
            access_token: accessToken,
            token_type: 'bearer',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (err: any) {
        console.error('Login error:', err.message);
        return res.status(500).json({ detail: 'Internal server error during login' });
    }
});

// GET /auth/me
router.get('/me', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
    return res.json({
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role
    });
});

export default router;
