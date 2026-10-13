import { Module } from '@nitrostack/core';
import { TaxModule } from '../tax/tax.module.js';
import { CouncilService } from './council.service.js';
import { CouncilTools } from './council.tools.js';

/**
 * Financial Council module — 3 deterministic scorer "agents" + a reconciler.
 * Imports TaxModule so the tax lens can reuse the real tax engine.
 */
@Module({
    name: 'council',
    description: 'Multi-lens financial advisor council (tax / growth / safety) + reconciler',
    imports: [TaxModule],
    controllers: [CouncilTools],
    providers: [CouncilService],
    exports: [CouncilService],
})
export class CouncilModule { }
