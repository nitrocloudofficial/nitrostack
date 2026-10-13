import { Module } from '@nitrostack/core';
import { FundsModule } from '../funds/funds.module.js';
import { TaxModule } from '../tax/tax.module.js';
import { GainsService } from './gains.service.js';
import { GainsTools } from './gains.tools.js';

/**
 * Capital-gains module — estimates MF capital-gains tax before a sale.
 * Imports FundsModule (live NAV valuation) and TaxModule (slab rate for debt).
 */
@Module({
    name: 'gains',
    description: 'Mutual fund capital-gains tax estimator',
    imports: [FundsModule, TaxModule],
    controllers: [GainsTools],
    providers: [GainsService],
    exports: [GainsService],
})
export class GainsModule { }
