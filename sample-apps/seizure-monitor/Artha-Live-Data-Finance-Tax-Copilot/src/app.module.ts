import { McpApp, Module, ConfigModule } from '@nitrostack/core';
import { TaxModule } from './modules/tax/tax.module.js';
import { FundsModule } from './modules/funds/funds.module.js';
import { BankModule } from './modules/bank/bank.module.js';
import { ComplianceModule } from './modules/compliance/compliance.module.js';
import { GainsModule } from './modules/gains/gains.module.js';
import { RatesModule } from './modules/rates/rates.module.js';
import { NewsModule } from './modules/news/news.module.js';
import { ResourcesModule } from './modules/resources/resources.module.js';
import { CouncilModule } from './modules/council/council.module.js';
import { CopilotModule } from './modules/copilot/copilot.module.js';

/**
 * Root Application Module — Personal Finance & Tax Copilot
 *
 * Wires together the four domain modules plus the orchestrating copilot module.
 * Domain modules each export their service so the copilot can inject and chain them.
 */
@McpApp({
    module: AppModule,
    server: {
        name: 'finance-tax-copilot',
        version: '1.0.0',
    },
    logging: {
        level: 'info',
    },
})
@Module({
    name: 'finance-copilot',
    description: 'Personal finance & tax copilot orchestrating tax, mutual funds, bank and compliance data',
    imports: [
        ConfigModule.forRoot(),
        TaxModule,
        FundsModule,
        BankModule,
        ComplianceModule,
        GainsModule,
        RatesModule,
        NewsModule,
        ResourcesModule,
        CouncilModule,
        CopilotModule,
    ],
})
export class AppModule { }
