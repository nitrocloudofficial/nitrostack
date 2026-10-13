import { Module } from '@nitrostack/core';
import { OrchestratorTools } from './orchestrator.tools.js';
import { OrchestratorResources } from './orchestrator.resources.js';
import { IdentityModule } from '../identity/identity.module.js';
import { EquipmentModule } from '../equipment/equipment.module.js';
import { WorkspaceModule } from '../workspace/workspace.module.js';
import { IdentityStore } from '../identity/identity.store.js';
import { EquipmentStore } from '../equipment/equipment.store.js';
import { WorkspaceStore } from '../workspace/workspace.store.js';

@Module({
  name: 'orchestrator',
  description: 'Orchestration layer for employee onboarding/offboarding across all systems',
  imports: [IdentityModule, EquipmentModule, WorkspaceModule],
  providers: [IdentityStore, EquipmentStore, WorkspaceStore],
  controllers: [OrchestratorTools, OrchestratorResources],
})
export class OrchestratorModule {}
