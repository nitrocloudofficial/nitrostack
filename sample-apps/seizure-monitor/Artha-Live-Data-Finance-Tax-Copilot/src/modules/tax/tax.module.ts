import { Module } from '@nitrostack/core';
import { TaxService } from './tax.service.js';
import { TaxTools } from './tax.tools.js';

@Module({
    name: 'tax',
    description: 'Old vs new regime income-tax calculator (FY 2025-26)',
    controllers: [TaxTools],
    providers: [TaxService],
    exports: [TaxService],
})
export class TaxModule { }
