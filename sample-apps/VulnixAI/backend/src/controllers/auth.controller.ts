import type { Request, Response } from 'express';
import { GitHubAuthService } from '../services/githubAuth.service.js';
import { JWTService } from '../services/jwt.service.js';
import { UserService } from '../services/user.service.js';
import { config } from '../config/env.js';
import type { AuthResponse } from '../types/auth.js';
import crypto from 'crypto';

// Store state temporarily (in production, use Redis or database)
const stateStore = new Map<string, number>();

export class AuthController {
  static async initiateGitHubLogin(req: Request, res: Response) {
    try {
      // If GITHUB_CLIENT_ID is not configured, bypass and redirect to frontend with mock token
      if (!config.github.clientId) {
        console.log('⚠️  GitHub Client ID not configured. Bypassing login with mock credentials.');
        const mockToken = JWTService.generateToken({
          userId: 99999,
          username: 'mock_developer',
          email: 'developer@vulnix.local',
        });
        
        // Dynamically determine frontend URL from referer/origin
        let frontendUrl = config.frontendUrl;
        const referer = req.headers.referer || req.headers.origin;
        if (referer) {
          try {
            const parsed = new URL(referer);
            frontendUrl = `${parsed.protocol}//${parsed.host}`;
          } catch (e) {}
        }

        const redirectUrl = `${frontendUrl.replace(/\/$/, '')}/auth/callback?token=${mockToken}`;
        return res.json({ url: redirectUrl });
      }

      // Generate random state for CSRF protection
      const state = crypto.randomBytes(32).toString('hex');
      stateStore.set(state, Date.now());

      // Clean up old states (older than 10 minutes)
      const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
      for (const [key, timestamp] of stateStore.entries()) {
        if (timestamp < tenMinutesAgo) {
          stateStore.delete(key);
        }
      }

      const authUrl = GitHubAuthService.getAuthorizationUrl(state);
      res.json({ url: authUrl });
    } catch (error) {
      console.error('Error initiating GitHub login:', error);
      res.status(500).json({ error: 'Failed to initiate GitHub login' });
    }
  }

  static async handleGitHubCallback(req: Request, res: Response) {
    const { code, state } = req.query;

    try {
      // Verify state to prevent CSRF
      if (!state || !stateStore.has(state as string)) {
        throw new Error('Invalid state parameter');
      }
      stateStore.delete(state as string);

      if (!code) {
        throw new Error('No authorization code provided');
      }

      // Exchange code for access token
      const accessToken = await GitHubAuthService.getAccessToken(code as string);

      // Get user data from GitHub
      const githubUser = await GitHubAuthService.getUserData(accessToken);

      // Save or update user in MongoDB with access token
      const user = await UserService.createOrUpdateUser(githubUser, accessToken);

      // Generate JWT token
      const token = JWTService.generateToken({
        userId: githubUser.id,
        username: githubUser.login,
        email: githubUser.email,
      });

      // Redirect to frontend with token
      const redirectUrl = `${config.frontendUrl}/auth/callback?token=${token}`;
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Error in GitHub callback:', error);
      const errorUrl = `${config.frontendUrl}/login?error=${encodeURIComponent('Authentication failed')}`;
      res.redirect(errorUrl);
    }
  }

  static async verifyToken(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const payload = JWTService.verifyToken(token);
      
      // Get user details from database
      const user = await UserService.getUserByGithubId(payload.userId);
      
      if (user) {
        res.json({ 
          valid: true, 
          user: {
            userId: user.githubId,
            username: user.username,
            email: user.email,
            name: user.name,
            avatarUrl: user.avatarUrl,
            bio: user.bio,
            company: user.company,
            location: user.location,
            firstLogin: user.firstLogin,
            lastLogin: user.lastLogin,
            lastActive: user.lastActive,
            loginCount: user.loginCount,
          }
        });
      } else {
        res.json({ valid: true, user: payload });
      }
    } catch (error) {
      res.status(401).json({ valid: false, error: 'Invalid token' });
    }
  }

  static async logout(req: Request, res: Response) {
    // In a stateless JWT system, logout is handled client-side
    // If you want to blacklist tokens, implement a token blacklist here
    res.json({ success: true, message: 'Logged out successfully' });
  }

  static async getUserRepositories(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const payload = JWTService.verifyToken(token);
      
      // Get user's GitHub access token
      const githubAccessToken = await UserService.getGithubAccessToken(payload.userId);
      
      if (!githubAccessToken) {
        return res.status(401).json({ error: 'GitHub access token not found. Please re-authenticate.' });
      }

      // Fetch repositories from GitHub
      const repositories = await GitHubAuthService.getUserRepositories(githubAccessToken);
      
      res.json({ repositories });
    } catch (error: any) {
      console.error('Error fetching repositories:', error);
      const msg = error?.message || 'Failed to fetch repositories';
      if (msg.includes('re-authenticate') || msg.includes('invalid or expired')) {
        return res.status(401).json({ error: msg });
      }
      res.status(500).json({ error: msg });
    }
  }

  static async getRepositoryBranches(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const payload = JWTService.verifyToken(token);
      const { owner, repo } = req.params;
      
      // Get user's GitHub access token
      const githubAccessToken = await UserService.getGithubAccessToken(payload.userId);
      
      if (!githubAccessToken) {
        return res.status(401).json({ error: 'GitHub access token not found. Please re-authenticate.' });
      }

      // Fetch branches from GitHub
      const branches = await GitHubAuthService.getRepositoryBranches(owner, repo, githubAccessToken);
      
      res.json({ branches });
    } catch (error) {
      console.error('Error fetching branches:', error);
      res.status(500).json({ error: 'Failed to fetch branches' });
    }
  }
}
