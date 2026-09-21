import { Router } from 'express';
import { WebsiteScanController } from '../controllers/websiteScan.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Domain Verification Routes
router.post('/verify/initiate', WebsiteScanController.initiateVerification);
router.post('/verify/check', WebsiteScanController.verifyDomain);
router.get('/verify/domains', WebsiteScanController.getVerifiedDomains);
router.get('/verify/status', WebsiteScanController.checkDomainVerification);
router.delete('/verify/domains/:domain', WebsiteScanController.deleteDomain);

// Add domain as owned (bypass verification)
router.post('/verify/add-owned', WebsiteScanController.addOwnedDomain);

// Scan a website (requires verified domain)
router.post('/scan', WebsiteScanController.scanWebsite);

// Penetration testing (requires verified domain) - ACTIVE ATTACK MODE
router.post('/pentest', WebsiteScanController.penetrationTest);

// Load testing (requires verified domain) - STRESS TESTING
router.post('/loadtest', WebsiteScanController.loadTest);

// Resilience test (requires verified domain)
router.post('/test-resilience', WebsiteScanController.testResilience);

// API Health Monitoring
router.get('/api-health', WebsiteScanController.getApiHealth);
router.post('/api-reset', WebsiteScanController.resetApiKeys);

// Get scan history
router.get('/history', WebsiteScanController.getScanHistory);

// Get specific scan
router.get('/:scanId', WebsiteScanController.getScanById);

// Delete scan
router.delete('/:scanId', WebsiteScanController.deleteScan);

export default router;
