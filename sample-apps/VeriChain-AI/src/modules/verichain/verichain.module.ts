import { Module } from '@nitrostack/core';
import { VerichainTools } from './verichain.tools.js';
import { VerichainPrompts } from './verichain.prompts.js';
import { VerichainResources } from './verichain.resources.js';

@Module({
    name: 'verichain',
    description: 'VeriChain AI evidence intelligence module',
    controllers: [VerichainTools, VerichainPrompts, VerichainResources],
    providers: [],
})
export class VerichainModule { }
