import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../database/connection.js';

const SECRET_KEY = process.env.SECRET_KEY || 'verichain_secure_secret_key_2026_hackathon_demo';

export interface AuthenticatedRequest extends Request {
    user?: any;
}

export const authenticateUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ detail: 'Missing or malformed authentication token' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, SECRET_KEY) as { sub?: string };
        const username = decoded.sub;

        if (!username) {
            return res.status(401).json({ detail: 'Invalid token payload' });
        }

        const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
        if (!user) {
            return res.status(401).json({ detail: 'User not found' });
        }

        req.user = user;
        next();
    } catch (err: any) {
        console.error('JWT Verification failed:', err.message);
        return res.status(401).json({ detail: 'Could not validate credentials' });
    }
};

export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).json({ detail: 'Authentication required' });
    }
    if (req.user.role !== 'admin') {
        return res.status(403).json({ detail: 'Access forbidden: Admin role required' });
    }
    next();
};
