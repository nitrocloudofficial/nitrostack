import { ToolDecorator as Tool, Widget, ExecutionContext, Injectable, Cache, RateLimit, z } from '@nitrostack/core';
import { BankService } from './bank.service.js';

const VerifyIfscSchema = z.object({
    ifsc: z.string().min(11).max(11).describe('11-character IFSC code, e.g. HDFC0000001'),
});

@Injectable({ deps: [BankService] })
export class BankTools {
    constructor(private readonly bankService: BankService) { }

    @Tool({
        name: 'verify_bank_ifsc',
        description:
            'Verify an Indian bank IFSC code and return the bank name, branch, full address and supported ' +
            'payment rails (NEFT/RTGS/IMPS/UPI) using the free, live Razorpay IFSC API. ' +
            'Useful before setting up a refund/payout account.',
        inputSchema: VerifyIfscSchema,
        examples: {
            request: { ifsc: 'HDFC0000001' },
            response: {
                ifsc: 'HDFC0000001',
                bank: 'HDFC Bank',
                branch: 'HDFC BANK LTD',
                city: 'MUMBAI',
                state: 'MAHARASHTRA',
                supports: { neft: true, rtgs: true, imps: true, upi: true },
            },
        },
    })
    @Widget('bank-details')
    @Cache({ ttl: 86400 })
    @RateLimit({ requests: 30, window: '1m' })
    async verifyBankIfsc(args: z.infer<typeof VerifyIfscSchema>, ctx: ExecutionContext) {
        ctx.logger.info('Verifying IFSC', { ifsc: args.ifsc });
        return this.bankService.verifyIfsc(args.ifsc);
    }
}
