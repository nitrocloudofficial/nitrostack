import { MonitoredSite } from '../db/models/MonitoredSite.model.js';
import { MonitoringService } from '../services/monitoring.service.js';

export class MonitoringWorker {
  private static interval: NodeJS.Timeout | null = null;
  private static readonly CHECK_INTERVAL = 60000; // 1 minute

  static start() {
    if (this.interval) {
      console.log('⚠️  Monitoring worker already running');
      return;
    }

    console.log('🔄 Starting monitoring worker...');
    
    // Run immediately on start
    this.checkAllSites();

    // Then run periodically
    this.interval = setInterval(() => {
      this.checkAllSites();
    }, this.CHECK_INTERVAL);

    console.log(`✅ Monitoring worker started (checking every ${this.CHECK_INTERVAL / 1000}s)`);
  }

  static stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log('🛑 Monitoring worker stopped');
    }
  }

  private static async checkAllSites() {
    try {
      const sites = await MonitoredSite.find({});
      
      if (sites.length === 0) {
        return;
      }

      const now = Date.now();
      
      // Filter sites that need checking based on their individual intervals
      const sitesToCheck = sites.filter(site => {
        const lastCheckedTime = new Date(site.lastChecked).getTime();
        const intervalMs = site.checkInterval * 1000;
        return (now - lastCheckedTime) >= intervalMs;
      });

      if (sitesToCheck.length === 0) {
        return;
      }

      console.log(`🔍 Checking ${sitesToCheck.length} of ${sites.length} monitored sites...`);

      // Check all sites in parallel (with some throttling)
      const batchSize = 5;
      for (let i = 0; i < sitesToCheck.length; i += batchSize) {
        const batch = sitesToCheck.slice(i, i + batchSize);
        await Promise.all(
          batch.map(site => 
            MonitoringService.updateSiteHealth(site._id.toString())
              .catch(err => console.error(`Error checking ${site.url}:`, err.message))
          )
        );
      }

      console.log(`✅ Completed checking ${sitesToCheck.length} sites`);
    } catch (error) {
      console.error('Error in monitoring worker:', error);
    }
  }
}
