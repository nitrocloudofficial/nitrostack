import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { MedicationModule } from './modules/medication/medication.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { EmergencyModule } from './modules/emergency/emergency.module.js';
import { GatewayModule } from './modules/gateway/gateway.module.js';
import { SystemHealthCheck } from './health/system.health.js';

/**
 * Root Application Module — Family MedCare Ecosystem
 *
 * A multi-agent MCP server for caregivers managing multi-generational families.
 *
 * Registered Agents:
 * - Agent 1 (HealthModule): Health Memory
 *   Tools: extract_health_data, update_health_memory
 *   Resources: health://patient-profiles, health://patient-profile/{patient_id}
 *
 * - Agent 2 (MedicationModule): Medication Safety & Authenticity
 *   Tools: check_drug_safety, lookup_drug_label, verify_medication_authenticity
 *   Resources: medication://pharmacogenomics, medication://counterfeit-batches
 *
 * - Agent 3 (EmergencyModule): Emergency & Family Hub
 *   Tools: generate_emergency_card
 *   Prompts: caregiver_briefing
 *
 * - GatewayModule: Secure Data Gateway integration surface
 *   Tools: secure_issue_session_token, secure_check_drug_safety
 *   See src/gateway/SecureDataGateway.ts for the full architecture.
 */
@McpApp({
  module: AppModule,
  server: {
    name: 'family-medcare-ecosystem',
    version: '1.0.0'
  },
  logging: {
    level: 'info'
  }
})
@Module({
  name: 'app',
  description: 'Family MedCare Ecosystem — multi-agent health memory MCP server for multi-generational family caregiving',
  imports: [
    ConfigModule.forRoot(),
    MedicationModule,
    HealthModule,
    EmergencyModule,
    GatewayModule
  ],
  providers: [
    SystemHealthCheck
  ]
})
export class AppModule {}
