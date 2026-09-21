import type { Request, Response } from 'express';
import { JWTService } from '../services/jwt.service.js';
import { SandboxScannerService } from '../services/sandboxScanner.service.js';
import { WebsiteScan } from '../db/models/WebsiteScan.model.js';

export class SandboxScanController {
  /**
   * Start a sandbox scan
   */
  static async startSandboxScan(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const payload = JWTService.verifyToken(token);
      const { repoUrl, branch } = req.body;

      if (!repoUrl) {
        return res.status(400).json({ error: 'Repository URL is required' });
      }

      // Validate GitHub URL
      if (!repoUrl.includes('github.com')) {
        return res.status(400).json({ error: 'Only GitHub repositories are supported' });
      }

      const sandboxId = await SandboxScannerService.createSandbox(
        payload.userId.toString(),
        repoUrl,
        branch || 'main'
      );

      res.json({
        sandboxId,
        message: 'Sandbox environment created. Processing started.',
      });
    } catch (error: any) {
      console.error('Error starting sandbox scan:', error);
      res.status(500).json({ error: error.message || 'Failed to start sandbox scan' });
    }
  }

  /**
   * Get sandbox status
   */
  static async getSandboxStatus(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      JWTService.verifyToken(token);
      const { sandboxId } = req.params;

      const sandbox = SandboxScannerService.getSandboxStatus(sandboxId);

      if (!sandbox) {
        return res.status(404).json({ error: 'Sandbox not found' });
      }

      const vulnCount = sandbox.scanId ? await this.getVulnerabilityCount(sandbox.scanId) : 0;

      res.json({
        status: sandbox.status,
        message: sandbox.logs[sandbox.logs.length - 1]?.message || '',
        url: sandbox.url,
        scanId: sandbox.scanId,
        vulnerabilities: vulnCount,
        codeScanResults: sandbox.codeScanResults || null,
        penTestResults: sandbox.penTestResults
          ? {
              vulnerabilitiesFound: sandbox.penTestResults.vulnerabilitiesFound,
              riskScore: sandbox.penTestResults.riskScore,
              results: sandbox.penTestResults.results,
            }
          : null,
        error: sandbox.error,
        logs: sandbox.logs.map(log => ({
          time: log.time.toISOString(),
          message: log.message,
          level: log.level,
        })),
      });
    } catch (error: any) {
      console.error('Error getting sandbox status:', error);
      res.status(500).json({ error: 'Failed to get sandbox status' });
    }
  }

  /**
   * Get vulnerability count from scan
   */
  private static async getVulnerabilityCount(scanId: string): Promise<number> {
    try {
      const scan = await WebsiteScan.findById(scanId);
      return scan?.vulnerabilities?.length || 0;
    } catch (error) {
      return 0;
    }
  }
}
