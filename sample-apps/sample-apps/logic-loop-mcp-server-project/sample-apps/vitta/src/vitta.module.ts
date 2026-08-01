import { Module } from '@nitrostack/core';
import { IntakeTools } from './tools/intake.tools.js';
import { DecisionTools } from './tools/decision.tools.js';
import { DocumentTools } from './tools/document.tools.js';
import { AuditTools } from './tools/audit.tools.js';
import { SystemTools } from './tools/system.tools.js';
import { AdvisoryTools } from './tools/advisory.tools.js';
import { VittaResources } from './resources/vitta.resources.js';
import { VittaPrompts } from './prompts/vitta.prompts.js';

/**
 * VittaModule — the NBFC lending capability layer.
 * 16 Tools (12 golden-path + simulate_scenario + get_reference_rates + revoke_consent + health_check),
 * 5 Resources, 5 Prompts.
 */
@Module({
  name: 'vitta',
  description: 'NBFC personal-loan origination: qualify → consent → KYC → bureau → underwrite → offers → sanction → audit.',
  controllers: [
    IntakeTools,
    DecisionTools,
    DocumentTools,
    AuditTools,
    SystemTools,
    AdvisoryTools,
    VittaResources,
    VittaPrompts,
  ],
})
export class VittaModule {}
