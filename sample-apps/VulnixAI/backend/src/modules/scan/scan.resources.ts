import { ResourceDecorator as Resource, ExecutionContext, Injectable } from '@nitrostack/core';
import { Scan } from '../../db/models/Scan.model.js';
import { WebsiteScan } from '../../db/models/WebsiteScan.model.js';
import { PenetrationTest } from '../../db/models/PenetrationTest.model.js';
import { LoadTest } from '../../db/models/LoadTest.model.js';
import { User } from '../../db/models/User.model.js';

@Injectable()
export class ScanResources {
  private async getUserId(): Promise<number> {
    try {
      const firstUser = await User.findOne({});
      return firstUser ? firstUser.githubId : 99999;
    } catch {
      return 99999;
    }
  }

  private static calculateRepoScore(summary: any): number {
    const critical = summary.critical || 0;
    const high = summary.high || 0;
    const medium = summary.medium || 0;
    const low = summary.low || 0;

    const totalWeight = critical * 10 + high * 6 + medium * 3 + low * 1;
    if (totalWeight === 0) return 100;
    return Math.max(10, 100 - totalWeight);
  }

  @Resource({
    uri: 'vulnix://history',
    name: 'Scan History',
    description: 'Lists all past scans and penetration tests',
  })
  async getScanHistory(ctx: ExecutionContext) {
    if (ctx && ctx.logger && typeof ctx.logger.info === 'function') {
      ctx.logger.info('Fetching Scan History resource');
    }
    const userId = await this.getUserId();

    const [repoScans, websiteScans, pentests, loadTests] = await Promise.all([
      Scan.find({ userId }).sort({ createdAt: -1 }).limit(50).select('-logs -vulnerabilities').lean(),
      WebsiteScan.find({ userId }).sort({ scanDate: -1 }).limit(50).lean(),
      PenetrationTest.find({ userId }).sort({ testDate: -1 }).limit(50).lean(),
      LoadTest.find({ userId }).sort({ testDate: -1 }).limit(50).lean(),
    ]);

    const history = [
      ...repoScans.map((scan: any) => ({
        id: scan._id,
        type: 'repository',
        target: scan.repoFullName || 'Unknown',
        url: scan.repoUrl || '',
        date: scan.startedAt || scan.createdAt,
        status: scan.status || 'unknown',
        summary: scan.summary || {},
        vulnerabilities: scan.summary?.total || 0,
        score: ScanResources.calculateRepoScore(scan.summary || {}),
      })),
      ...websiteScans.map((scan: any) => ({
        id: scan._id,
        type: 'website',
        target: scan.url || 'Unknown',
        url: scan.url || '',
        date: scan.scanDate || scan.createdAt,
        status: 'completed',
        vulnerabilities: scan.vulnerabilities?.length || 0,
        score: scan.securityScore || 100,
      })),
      ...pentests.map((scan: any) => ({
        id: scan._id,
        type: 'penetration',
        target: scan.url || 'Unknown',
        url: scan.url || '',
        date: scan.testDate || scan.createdAt,
        status: scan.status || 'completed',
        vulnerabilities: scan.vulnerabilitiesFound || 0,
        score: scan.riskScore !== undefined ? 100 - scan.riskScore : 100,
      })),
      ...loadTests.map((scan: any) => ({
        id: scan._id,
        type: 'load',
        target: scan.url || 'Unknown',
        url: scan.url || '',
        date: scan.testDate || scan.createdAt,
        status: scan.status || 'completed',
        vulnerabilities: 0,
        score: scan.performanceScore || 100,
      })),
    ];

    history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { history };
  }
}
