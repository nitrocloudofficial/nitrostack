import { SQLitePharmacyRepository } from './pharmacy.repository.sqlite.js';
import { PharmacyService } from './pharmacy.service.js';
import { RecommendationService } from './recommendation.service.js';

/**
 * Module-level singleton. This is the only place PharmacyRepository is
 * constructed. NitroStack appears to instantiate tool classes itself with
 * no arguments (see CalculatorTools), so injection happens via this shared
 * instance rather than through PharmacyTools' constructor.
 */
const pharmacyRepository = new SQLitePharmacyRepository();

export const pharmacyService = new PharmacyService(pharmacyRepository);

export const recommendationService =
  new RecommendationService(pharmacyService);