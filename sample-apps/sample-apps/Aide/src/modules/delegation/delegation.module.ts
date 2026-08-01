import { Module } from '@nitrostack/core';
import { DelegationTools } from './delegation.tools.js';
import { DelegationResources } from './delegation.resources.js';
import { DelegationPrompts } from './delegation.prompts.js';

@Module({
    name: 'delegation',
    description: 'Task delegation tools',
    controllers: [DelegationTools, DelegationResources]
})
export class DelegationModule { }

