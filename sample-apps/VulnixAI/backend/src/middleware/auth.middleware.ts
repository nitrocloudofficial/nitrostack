import type { Request, Response, NextFunction } from 'express';
import { JWTService } from '../services/jwt.service.js';
import { UserService } from '../services/user.service.js';

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    username: string;
    email: string;
  };
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const payload = JWTService.verifyToken(token);
    req.user = payload;
    
    // Update last active time in background (don't wait)
    UserService.updateLastActive(payload.userId).catch(err => 
      console.error('Failed to update last active:', err)
    );
    
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
