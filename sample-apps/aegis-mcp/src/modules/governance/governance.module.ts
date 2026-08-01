import { Module } from '@nitrostack/core';
import { GovernanceTools } from './governance.tools.js';
import { GovernanceResources } from './governance.resources.js';
import { GovernancePrompts } from './governance.prompts.js';

@Module({
    name: 'governance',
    description: 'Aegis governance module — capability auditing, toxic-combination detection, and attack-path explanation for connected AI agent tools.',
    controllers: [GovernanceTools, GovernanceResources, GovernancePrompts],
})
export class GovernanceModule { }
