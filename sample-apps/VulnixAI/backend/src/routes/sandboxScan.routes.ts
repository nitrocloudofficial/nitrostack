import { Router } from 'express';
import { SandboxScanController } from '../controllers/sandboxScan.controller.js';

const router = Router();

// Start sandbox scan
router.post('/start', SandboxScanController.startSandboxScan);

// Get sandbox status
router.get('/:sandboxId', SandboxScanController.getSandboxStatus);

export default router;
