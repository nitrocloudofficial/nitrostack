import { Router } from 'express';
import { MonitoringController } from '../controllers/monitoring.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get all monitored sites for the user
router.get('/', MonitoringController.getSites);

// Add a new site to monitor
router.post('/', MonitoringController.addSite);

// Refresh all sites
router.post('/refresh', MonitoringController.refreshAllSites);

// Refresh a specific site
router.post('/:siteId/refresh', MonitoringController.refreshSite);

// Update check interval for a site
router.patch('/:siteId/interval', MonitoringController.updateCheckInterval);

// Remove a monitored site
router.delete('/:siteId', MonitoringController.removeSite);

export default router;
