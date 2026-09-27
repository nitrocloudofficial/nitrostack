import axios from 'axios';
import https from 'https';
import { MonitoredSite, IMonitoredSite } from '../db/models/MonitoredSite.model.js';

interface HealthCheckResult {
  status: 'up' | 'down' | 'degraded';
  responseTime: number;
  sslValid: boolean;
  sslExpiry: Date | null;
  error?: string;
}

export class MonitoringService {
  private static readonly TIMEOUT = 10000; // 10 seconds
  private static readonly DEGRADED_THRESHOLD = 500; // 500ms
  private static readonly HISTORY_LENGTH = 12;

  static async checkSiteHealth(url: string): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const response = await axios.get(url, {
        timeout: this.TIMEOUT,
        validateStatus: (status) => status < 500,
        maxRedirects: 5,
        httpsAgent: new https.Agent({
          rejectUnauthorized: false, // Allow self-signed certs for checking
        }),
      });

      const responseTime = Date.now() - startTime;
      const status = response.status >= 200 && response.status < 400 
        ? (responseTime > this.DEGRADED_THRESHOLD ? 'degraded' : 'up')
        : 'degraded';

      // Check SSL certificate
      const sslInfo = await this.checkSSL(url);

      return {
        status,
        responseTime,
        sslValid: sslInfo.valid,
        sslExpiry: sslInfo.expiry,
      };
    } catch (error: any) {
      return {
        status: 'down',
        responseTime: 0,
        sslValid: false,
        sslExpiry: null,
        error: error.message,
      };
    }
  }

  private static async checkSSL(url: string): Promise<{ valid: boolean; expiry: Date | null }> {
    try {
      if (!url.startsWith('https://')) {
        return { valid: false, expiry: null };
      }

      const urlObj = new URL(url);
      
      return new Promise((resolve) => {
        const options = {
          host: urlObj.hostname,
          port: 443,
          method: 'GET',
          rejectUnauthorized: false,
        };

        const req = https.request(options, (res) => {
          const cert = (res.socket as any).getPeerCertificate();
          
          if (cert && cert.valid_to) {
            const expiry = new Date(cert.valid_to);
            const now = new Date();
            const valid = expiry > now;
            
            resolve({ valid, expiry });
          } else {
            resolve({ valid: false, expiry: null });
          }
        });

        req.on('error', () => {
          resolve({ valid: false, expiry: null });
        });

        req.end();
      });
    } catch (error) {
      return { valid: false, expiry: null };
    }
  }

  static async addSite(userId: number, url: string, name?: string, checkInterval: number = 60): Promise<IMonitoredSite> {
    // Normalize URL
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    
    // Generate name if not provided
    const siteName = name || new URL(normalizedUrl).hostname;

    // Validate check interval
    const validInterval = Math.max(30, Math.min(3600, checkInterval));

    // Check if site already exists for this user
    const existing = await MonitoredSite.findOne({ userId, url: normalizedUrl });
    if (existing) {
      throw new Error('Site already being monitored');
    }

    // Perform initial health check
    const healthCheck = await this.checkSiteHealth(normalizedUrl);

    // Create monitored site
    const site = await MonitoredSite.create({
      userId,
      url: normalizedUrl,
      name: siteName,
      status: healthCheck.status,
      responseTime: healthCheck.responseTime,
      uptime: healthCheck.status === 'up' ? 100 : 0,
      sslValid: healthCheck.sslValid,
      sslExpiry: healthCheck.sslExpiry,
      lastChecked: new Date(),
      responseHistory: [healthCheck.responseTime],
      statusHistory: [healthCheck.status],
      checkInterval: validInterval,
    });

    return site;
  }

  static async getUserSites(userId: number): Promise<IMonitoredSite[]> {
    return MonitoredSite.find({ userId }).sort({ createdAt: -1 });
  }

  static async updateSiteHealth(siteId: string): Promise<IMonitoredSite | null> {
    const site = await MonitoredSite.findById(siteId);
    if (!site) return null;

    const healthCheck = await this.checkSiteHealth(site.url);

    // Update response history (keep last 12)
    const responseHistory = [...site.responseHistory, healthCheck.responseTime].slice(-this.HISTORY_LENGTH);
    
    // Update status history (keep last 12)
    const statusHistory = [...site.statusHistory, healthCheck.status].slice(-this.HISTORY_LENGTH);

    // Calculate uptime based on status history
    const upCount = statusHistory.filter(s => s === 'up').length;
    const uptime = (upCount / statusHistory.length) * 100;

    site.status = healthCheck.status;
    site.responseTime = healthCheck.responseTime;
    site.uptime = parseFloat(uptime.toFixed(2));
    site.sslValid = healthCheck.sslValid;
    site.sslExpiry = healthCheck.sslExpiry;
    site.lastChecked = new Date();
    site.responseHistory = responseHistory;
    site.statusHistory = statusHistory;

    await site.save();
    return site;
  }

  static async removeSite(userId: number, siteId: string): Promise<boolean> {
    const result = await MonitoredSite.deleteOne({ _id: siteId, userId });
    return result.deletedCount > 0;
  }

  static async updateCheckInterval(userId: number, siteId: string, checkInterval: number): Promise<IMonitoredSite | null> {
    // Validate check interval
    const validInterval = Math.max(30, Math.min(3600, checkInterval));
    
    const site = await MonitoredSite.findOneAndUpdate(
      { _id: siteId, userId },
      { checkInterval: validInterval },
      { new: true }
    );
    
    return site;
  }

  static async refreshAllUserSites(userId: number): Promise<IMonitoredSite[]> {
    const sites = await this.getUserSites(userId);
    
    // Update all sites in parallel
    const updates = sites.map(site => this.updateSiteHealth(site._id.toString()));
    await Promise.all(updates);

    // Return updated sites
    return this.getUserSites(userId);
  }
}
