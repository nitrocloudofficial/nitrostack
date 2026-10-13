import { Module } from '@nitrostack/core';
import { FundsModule } from '../funds/funds.module.js';
import { RatesService } from './rates.service.js';
import { RatesTools } from './rates.tools.js';

/**
 * Rates module — RBI repo / FD benchmark rates, the EMI-vs-investment
 * comparator, and the cross-source Data Freshness Indicator. Imports FundsModule
 * so the freshness check can ping the live AMFI/MFAPI source.
 */
@Module({
    name: 'rates',
    description: 'Benchmark rates, EMI-vs-investment comparator and data-freshness indicator',
    imports: [FundsModule],
    controllers: [RatesTools],
    providers: [RatesService],
    exports: [RatesService],
})
export class RatesModule { }
