import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';

const router = Router();

// Initiate GitHub OAuth flow
router.get('/github', AuthController.initiateGitHubLogin);

// GitHub OAuth callback
router.get('/github/callback', AuthController.handleGitHubCallback);

// Verify JWT token
router.get('/verify', AuthController.verifyToken);

// Logout
router.post('/logout', AuthController.logout);

// Get user repositories
router.get('/repositories', AuthController.getUserRepositories);

// Get repository branches
router.get('/repositories/:owner/:repo/branches', AuthController.getRepositoryBranches);

export default router;
