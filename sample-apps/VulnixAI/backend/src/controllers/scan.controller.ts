import type { Request, Response } from 'express';
import { Scan } from '../db/models/Scan.model.js';
import { UserService } from '../services/user.service.js';
import { JWTService } from '../services/jwt.service.js';
import { RepoScannerService } from '../services/repoScanner.service.js';
import { GitHubAuthService } from '../services/githubAuth.service.js';
import { GitHubPRService } from '../services/githubPR.service.js';
import { DownloadService } from '../services/downloadService.service.js';
import { RepoFilesService } from '../services/repoFiles.service.js';

export class ScanController {
  static async startScan(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const payload = JWTService.verifyToken(token);
      const { repoId, repoName, repoFullName, repoUrl, defaultBranch } = req.body;

      if (!repoId || !repoName || !repoFullName) {
        return res.status(400).json({ error: 'Missing required repository information' });
      }

      // Get user's GitHub access token
      const githubAccessToken = await UserService.getGithubAccessToken(payload.userId);
      
      if (!githubAccessToken) {
        return res.status(401).json({ error: 'GitHub access token not found. Please re-authenticate.' });
      }

      // Create scan record
      const scan = await Scan.create({
        userId: payload.userId,
        repoId,
        repoName,
        repoFullName,
        repoUrl: repoUrl || `https://github.com/${repoFullName}`,
        defaultBranch: defaultBranch || 'main',
        status: 'queued',
        startedAt: new Date(),
        vulnerabilities: [],
        summary: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          total: 0,
          patchable: 0,
        },
        logs: [{
          time: new Date(),
          message: 'Scan queued',
          level: 'info',
        }],
      });

      // Start scanning in background (don't await)
      RepoScannerService.scanRepository(
        scan._id.toString(),
        repoFullName,
        defaultBranch || 'main',
        githubAccessToken
      ).catch(error => {
        console.error('Background scan error:', error);
      });

      res.json({
        scanId: scan._id,
        status: scan.status,
        message: 'Scan started successfully',
      });
    } catch (error: any) {
      console.error('Error starting scan:', error);
      res.status(500).json({ error: 'Failed to start scan' });
    }
  }

  static async getScanStatus(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const payload = JWTService.verifyToken(token);
      const { scanId } = req.params;

      const scan = await Scan.findOne({ _id: scanId, userId: payload.userId });

      if (!scan) {
        return res.status(404).json({ error: 'Scan not found' });
      }

      res.json({
        id: scan._id,
        repoName: scan.repoName,
        repoFullName: scan.repoFullName,
        status: scan.status,
        startedAt: scan.startedAt,
        completedAt: scan.completedAt,
        summary: scan.summary,
        logs: scan.logs.map(log => ({
          time: log.time.toISOString(),
          message: log.message,
          level: log.level,
        })),
        error: scan.error,
      });
    } catch (error: any) {
      console.error('Error getting scan status:', error);
      res.status(500).json({ error: 'Failed to get scan status' });
    }
  }

  static async getScanResults(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const payload = JWTService.verifyToken(token);
      const { scanId } = req.params;

      const scan = await Scan.findOne({ _id: scanId, userId: payload.userId });

      if (!scan) {
        return res.status(404).json({ error: 'Scan not found' });
      }

      if (scan.status !== 'completed') {
        return res.status(400).json({ error: 'Scan not completed yet' });
      }

      res.json({
        id: scan._id,
        repoName: scan.repoName,
        repoFullName: scan.repoFullName,
        status: scan.status,
        startedAt: scan.startedAt,
        completedAt: scan.completedAt,
        vulnerabilities: scan.vulnerabilities,
        summary: scan.summary,
      });
    } catch (error: any) {
      console.error('Error getting scan results:', error);
      res.status(500).json({ error: 'Failed to get scan results' });
    }
  }

  static async getUserScans(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const payload = JWTService.verifyToken(token);
      const limit = parseInt(req.query.limit as string) || 50;

      const scans = await Scan.find({ userId: payload.userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('-logs -vulnerabilities');

      res.json({
        scans: scans.map(scan => ({
          id: scan._id,
          repoName: scan.repoName,
          repoFullName: scan.repoFullName,
          status: scan.status,
          startedAt: scan.startedAt,
          completedAt: scan.completedAt,
          summary: scan.summary,
        })),
      });
    } catch (error: any) {
      console.error('Error getting user scans:', error);
      res.status(500).json({ error: 'Failed to get scans' });
    }
  }

  static async createFixPR(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const payload = JWTService.verifyToken(token);
      const { scanId } = req.params;

      // Get scan
      const scan = await Scan.findOne({ _id: scanId, userId: payload.userId });

      if (!scan) {
        return res.status(404).json({ error: 'Scan not found' });
      }

      if (scan.status !== 'completed') {
        return res.status(400).json({ error: 'Scan not completed yet' });
      }

      // Check if there are fixable vulnerabilities
      const fixableVulns = scan.vulnerabilities.filter(v => v.fixAvailable);
      
      if (fixableVulns.length === 0) {
        return res.status(400).json({ error: 'No fixable vulnerabilities found' });
      }

      // Get user's GitHub access token
      const githubAccessToken = await UserService.getGithubAccessToken(payload.userId);
      
      if (!githubAccessToken) {
        return res.status(401).json({ error: 'GitHub access token not found. Please re-authenticate.' });
      }

      // Create PR with fixes
      const { prUrl, prNumber } = await GitHubPRService.createSecurityFixPR(
        scan.repoFullName,
        scan.defaultBranch,
        fixableVulns,
        githubAccessToken
      );

      // Try to add labels (optional)
      try {
        await GitHubPRService.addLabels(scan.repoFullName, prNumber, githubAccessToken);
      } catch (error) {
        // Labels are optional, continue even if this fails
      }

      // Save PR info to scan
      scan.prInfo = {
        prNumber,
        prUrl,
        createdAt: new Date(),
        status: 'open',
      };
      await scan.save();

      res.json({
        success: true,
        prUrl,
        prNumber,
        fixedCount: fixableVulns.length,
        message: `Pull request created with ${fixableVulns.length} security fixes`,
      });
    } catch (error: any) {
      console.error('Error creating fix PR:', error);
      res.status(500).json({ error: error.message || 'Failed to create pull request' });
    }
  }

  static async getFileContent(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const payload = JWTService.verifyToken(token);
      const { scanId, filePath } = req.params;

      // Get scan
      const scan = await Scan.findOne({ _id: scanId, userId: payload.userId });

      if (!scan) {
        return res.status(404).json({ error: 'Scan not found' });
      }

      // Get user's GitHub access token
      const githubAccessToken = await UserService.getGithubAccessToken(payload.userId);
      
      if (!githubAccessToken) {
        return res.status(401).json({ error: 'GitHub access token not found. Please re-authenticate.' });
      }

      // Fetch file content
      const fileContent = await RepoFilesService.getFileContent(
        scan.repoFullName,
        filePath,
        scan.defaultBranch,
        githubAccessToken
      );

      res.json(fileContent);
    } catch (error: any) {
      console.error('Error fetching file content:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch file content' });
    }
  }

  static async updateFileContent(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const payload = JWTService.verifyToken(token);
      const { scanId, filePath } = req.params;
      const { content, sha, commitMessage } = req.body;

      if (!content || !sha || !commitMessage) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Get scan
      const scan = await Scan.findOne({ _id: scanId, userId: payload.userId });

      if (!scan) {
        return res.status(404).json({ error: 'Scan not found' });
      }

      // Get user's GitHub access token
      const githubAccessToken = await UserService.getGithubAccessToken(payload.userId);
      
      if (!githubAccessToken) {
        return res.status(401).json({ error: 'GitHub access token not found. Please re-authenticate.' });
      }

      // Update file
      await RepoFilesService.updateFileContent(
        scan.repoFullName,
        filePath,
        content,
        sha,
        scan.defaultBranch,
        commitMessage,
        githubAccessToken
      );

      res.json({ success: true, message: 'File updated successfully' });
    } catch (error: any) {
      console.error('Error updating file:', error);
      res.status(500).json({ error: error.message || 'Failed to update file' });
    }
  }

  static async downloadFixedFiles(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const payload = JWTService.verifyToken(token);
      const { scanId } = req.params;

      // Get scan
      const scan = await Scan.findOne({ _id: scanId, userId: payload.userId });

      if (!scan) {
        return res.status(404).json({ error: 'Scan not found' });
      }

      if (scan.status !== 'completed') {
        return res.status(400).json({ error: 'Scan not completed yet' });
      }

      // Check if there are fixable vulnerabilities
      const fixableVulns = scan.vulnerabilities.filter(v => v.fixAvailable);
      
      if (fixableVulns.length === 0) {
        return res.status(400).json({ error: 'No fixable vulnerabilities found' });
      }

      // Get user's GitHub access token
      const githubAccessToken = await UserService.getGithubAccessToken(payload.userId);
      
      if (!githubAccessToken) {
        return res.status(401).json({ error: 'GitHub access token not found. Please re-authenticate.' });
      }

      // Stream ZIP file
      await DownloadService.downloadFixedFilesZip(
        res,
        scan.repoFullName,
        scan.defaultBranch,
        fixableVulns,
        githubAccessToken
      );
    } catch (error: any) {
      console.error('Error downloading fixed files:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message || 'Failed to download files' });
      }
    }
  }
}
