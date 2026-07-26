/**
 * Initialize all mock data fixtures
 * Call this once at app startup
 */

import { initializeNominees } from './nominees.js';
import { initializeConsents } from './consents.js';
import { initializeWaitTimes } from './waitTimes.js';

export function initializeFixtures(): void {
  initializeNominees();
  initializeConsents();
  initializeWaitTimes();
}
