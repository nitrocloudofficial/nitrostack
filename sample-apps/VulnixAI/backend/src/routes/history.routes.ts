import { Router } from 'express';
import { HistoryController } from '../controllers/history.controller.js';

const router = Router();

// Get all scan history (unified)
router.get('/all', HistoryController.getAllHistory);

// Get detailed scan by ID and type
router.get('/:type/:id', HistoryController.getScanDetail);

export default router;
