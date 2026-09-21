import type { Request, Response } from 'express';
import { JWTService } from '../services/jwt.service.js';
import { Scan } from '../db/models/Scan.model.js';
import { WebsiteScan } from '../db/models/WebsiteScan.model.js';
import { PenetrationTest } from '../db/models/PenetrationTest.model.js';
import { LoadTest } from '../db/models/LoadTest.model.js';

export class HistoryController {
  /**
   * Get all scan history (unified view)
   */
  static async getAllHistory(req: Request, res: Response) {
    try {
      console.log('[History] Received request for all history');
      
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        console.log('[History] No token provided');
        return res.status(401).json({ error: 'No token provided' });
      }

      let payload;
      try {
        payload = JWTService.verifyToken(token);
        console.log('[History] Token verified for user:', payload.userId);
      } catch (error) {
        console.log('[History] Token verification failed:', error);
        return res.status(401).json({ error: 'Invalid token' });
      }

      const limit = parseInt(req.query.limit as string) || 100;
      console.log('[History] Fetching scans with limit:', limit);

      // Fetch all scan types with error handling
      const [repoScans, websiteScans, pentests, loadTests] = await Promise.allSettled([
        Scan.find({ userId: payload.userId })
          .sort({ createdAt: -1 })
          .limit(limit)
          .select('-logs -vulnerabilities')
          .lean(),
        
        WebsiteScan.find({ userId: payload.userId })
          .sort({ scanDate: -1 })
          .limit(limit)
          .lean(),
        
        PenetrationTest.find({ userId: payload.userId })
          .sort({ testDate: -1 })
          .limit(limit)
          .lean(),
        
        LoadTest.find({ userId: payload.userId })
          .sort({ testDate: -1 })
          .limit(limit)
          .lean(),
      ]);

      console.log('[History] Fetch results:', {
        repoScans: repoScans.status,
        websiteScans: websiteScans.status,
        pentests: pentests.status,
        loadTests: loadTests.status,
      });

      // Extract successful results
      const repoScansData = repoScans.status === 'fulfilled' ? repoScans.value : [];
      const websiteScansData = websiteScans.status === 'fulfilled' ? websiteScans.value : [];
      const pentestsData = pentests.status === 'fulfilled' ? pentests.value : [];
      const loadTestsData = loadTests.status === 'fulfilled' ? loadTests.value : [];

      console.log('[History] Data counts:', {
        repoScans: repoScansData.length,
        websiteScans: websiteScansData.length,
        pentests: pentestsData.length,
        loadTests: loadTestsData.length,
      });

      // Normalize all scans to unified format
      const history = [
        ...repoScansData.map((scan: any) => ({
          id: scan._id,
          type: 'repository' as const,
          target: scan.repoFullName || 'Unknown',
          url: scan.repoUrl || '',
          date: scan.startedAt || scan.createdAt,
          status: scan.status || 'unknown',
          summary: scan.summary || {},
          vulnerabilities: scan.summary?.total || 0,
          score: HistoryController.calculateRepoScore(scan.summary || {}),
        })),
        
        ...websiteScansData.map((scan: any) => ({
          id: scan._id,
          type: 'website' as const,
          target: scan.url || 'Unknown',
          url: scan.url || '',
          date: scan.scanDate || scan.createdAt,
          status: 'completed',
          vulnerabilities: scan.vulnerabilities?.length || 0,
          score: scan.securityScore || 0,
          technologies: scan.technologies || [],
        })),
        
        ...pentestsData.map((test: any) => ({
          id: test._id,
          type: 'penetration' as const,
          target: test.url || 'Unknown',
          url: test.url || '',
          date: test.testDate || test.createdAt,
          status: 'completed',
          summary: test.summary || {},
          vulnerabilities: test.summary?.failed || 0,
          score: HistoryController.calculatePentestScore(test.summary || {}),
        })),
        
        ...loadTestsData.map((test: any) => ({
          id: test._id,
          type: 'load' as const,
          target: test.url || 'Unknown',
          url: test.url || '',
          date: test.testDate || test.createdAt,
          status: 'completed',
          results: test.results || {},
          score: HistoryController.calculateLoadTestScore(test.results || {}),
        })),
      ];

      // Sort by date (most recent first)
      history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      console.log('[History] Returning', history.length, 'total scans');

      res.json({
        history: history.slice(0, limit),
        stats: {
          totalScans: history.length,
          repoScans: repoScansData.length,
          websiteScans: websiteScansData.length,
          pentests: pentestsData.length,
          loadTests: loadTestsData.length,
        },
      });
    } catch (error: any) {
      console.error('[History] Error getting history:', error);
      console.error('[History] Error stack:', error.stack);
      res.status(500).json({ 
        error: 'Failed to get scan history', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Get detailed scan by ID and type
   */
  static async getScanDetail(req: Request, res: Response) {
    try {
      const { id, type } = req.params;
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      let payload;
      try {
        payload = JWTService.verifyToken(token);
      } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      let scan;
      switch (type) {
        case 'repository':
          scan = await Scan.findOne({ _id: id, userId: payload.userId }).lean();
          break;
        case 'website':
          scan = await WebsiteScan.findOne({ _id: id, userId: payload.userId }).lean();
          break;
        case 'penetration':
          scan = await PenetrationTest.findOne({ _id: id, userId: payload.userId }).lean();
          break;
        case 'load':
          scan = await LoadTest.findOne({ _id: id, userId: payload.userId }).lean();
          break;
        default:
          return res.status(400).json({ error: 'Invalid scan type' });
      }

      if (!scan) {
        return res.status(404).json({ error: 'Scan not found' });
      }

      res.json({ scan, type });
    } catch (error: any) {
      console.error('[History] Error getting scan detail:', error);
      res.status(500).json({ 
        error: 'Failed to get scan detail', 
        details: error.message 
      });
    }
  }

  /**
   * Calculate score for repository scans
   */
  private static calculateRepoScore(summary: any): number {
    const total = summary.total || 0;
    if (total === 0) return 100;

    const weighted = 
      (summary.critical || 0) * 10 +
      (summary.high || 0) * 5 +
      (summary.medium || 0) * 2 +
      (summary.low || 0) * 1;

    return Math.max(0, Math.min(100, 100 - weighted));
  }

  /**
   * Calculate score for penetration tests
   */
  private static calculatePentestScore(summary: any): number {
    const total = summary.totalTests || 0;
    if (total === 0) return 100;

    const passRate = (summary.passed || 0) / total;
    return Math.round(passRate * 100);
  }

  /**
   * Calculate score for load tests
   */
  private static calculateLoadTestScore(results: any): number {
    const successRate = results.totalRequests > 0
      ? (results.successfulRequests / results.totalRequests) * 100
      : 0;

    return Math.round(successRate);
  }
}
