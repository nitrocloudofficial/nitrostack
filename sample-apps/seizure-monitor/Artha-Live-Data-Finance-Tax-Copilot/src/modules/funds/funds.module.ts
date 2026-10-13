import { Module } from '@nitrostack/core';
import { FundsService } from './funds.service.js';
import { FundsTools } from './funds.tools.js';

@Module({
    name: 'funds',
    description: 'Mutual fund NAV, history and returns (XIRR) via the free MFAPI.in API',
    controllers: [FundsTools],
    providers: [FundsService],
    exports: [FundsService],
})
export class FundsModule { }
