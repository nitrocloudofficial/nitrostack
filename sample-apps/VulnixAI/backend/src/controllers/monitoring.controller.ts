import { Request, Response } from 'express';
import { MonitoringService } from '../services/monitoring.service.js';
import '../types/auth.js'; // Import to extend Express Request type

export class MonitoringController {
  static async addSite(req: Request, res: Response) {
    try {
      const { url, name, checkInterval } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!url) {
        return res.status(400).json({ error: 'URL is required' });
      }

      const site = await MonitoringService.addSite(userId, url, name, checkInterval);
      
      res.status(201).json(site);
    } catch (error: any) {
      console.error('Error adding site:', error);
      res.status(400).json({ error: error.message || 'Failed to add site' });
    }
  }

  static async getSites(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const sites = await MonitoringService.getUserSites(userId);
      
      res.json(sites);
    } catch (error: any) {
      console.error('Error fetching sites:', error);
      res.status(500).json({ error: 'Failed to fetch sites' });
    }
  }

  static async refreshSite(req: Request, res: Response) {
    try {
      const { siteId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const site = await MonitoringService.updateSiteHealth(siteId);
      
      if (!site) {
        return res.status(404).json({ error: 'Site not found' });
      }

      // Verify ownership
      if (site.userId !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      res.json(site);
    } catch (error: any) {
      console.error('Error refreshing site:', error);
      res.status(500).json({ error: 'Failed to refresh site' });
    }
  }

  static async refreshAllSites(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const sites = await MonitoringService.refreshAllUserSites(userId);
      
      res.json(sites);
    } catch (error: any) {
      console.error('Error refreshing all sites:', error);
      res.status(500).json({ error: 'Failed to refresh sites' });
    }
  }

  static async removeSite(req: Request, res: Response) {
    try {
      const { siteId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const success = await MonitoringService.removeSite(userId, siteId);
      
      if (!success) {
        return res.status(404).json({ error: 'Site not found' });
      }

      res.json({ message: 'Site removed successfully' });
    } catch (error: any) {
      console.error('Error removing site:', error);
      res.status(500).json({ error: 'Failed to remove site' });
    }
  }

  static async updateCheckInterval(req: Request, res: Response) {
    try {
      const { siteId } = req.params;
      const { checkInterval } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!checkInterval || checkInterval < 30 || checkInterval > 3600) {
        return res.status(400).json({ error: 'Check interval must be between 30 and 3600 seconds' });
      }

      const site = await MonitoringService.updateCheckInterval(userId, siteId, checkInterval);
      
      if (!site) {
        return res.status(404).json({ error: 'Site not found' });
      }

      res.json(site);
    } catch (error: any) {
      console.error('Error updating check interval:', error);
      res.status(500).json({ error: 'Failed to update check interval' });
    }
  }
}
