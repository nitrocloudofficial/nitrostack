import { Module } from '@nitrostack/core';
import { BankService } from './bank.service.js';
import { BankTools } from './bank.tools.js';

@Module({
    name: 'bank',
    description: 'IFSC / bank branch verification via the free Razorpay IFSC API',
    controllers: [BankTools],
    providers: [BankService],
    exports: [BankService],
})
export class BankModule { }
