import { SQLiteProcurementRepository } from './procurement.repository.sqlite.js';
import { ProcurementService } from './procurement.service.js';
import { RecommendationService } from '../pharmacy/recommendation.service.js';
import { pharmacyService } from '../pharmacy/pharmacy.instance.js';

/**
 * Module-level singleton, same pattern as pharmacy.instance.ts. Reuses the
 * existing pharmacyService singleton rather than constructing a second
 * PharmacyService/PharmacyRepository instance.
 */
const procurementRepository = new SQLiteProcurementRepository();
const recommendationService = new RecommendationService(pharmacyService);

export const procurementService = new ProcurementService(
  procurementRepository,
  recommendationService
);