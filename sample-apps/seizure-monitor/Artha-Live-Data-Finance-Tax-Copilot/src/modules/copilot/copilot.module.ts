import { Module } from '@nitrostack/core';
import { TaxModule } from '../tax/tax.module.js';
import { FundsModule } from '../funds/funds.module.js';
import { BankModule } from '../bank/bank.module.js';
import { ComplianceModule } from '../compliance/compliance.module.js';
import { CopilotService } from './copilot.service.js';
import { CopilotTools } from './copilot.tools.js';
import { CopilotPrompts } from './copilot.prompts.js';

/**
 * Copilot module — imports the four domain modules (whose services they export)
 * so CopilotService can inject and orchestrate them.
 */
@Module({
    name: 'copilot',
    description: 'Agentic orchestrator that chains tax, funds, bank and compliance into one plan',
    imports: [TaxModule, FundsModule, BankModule, ComplianceModule],
    controllers: [CopilotTools, CopilotPrompts],
    providers: [CopilotService],
})
export class CopilotModule { }
