import { PromptDecorator as Prompt, ExecutionContext, Injectable } from '@nitrostack/core';

interface PromptMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

/**
 * Agent-facing prompt that primes an MCP client to behave as the Finance &
 * Tax Copilot — describing when to reach for each tool and how to chain them.
 */
@Injectable()
export class CopilotPrompts {
    @Prompt({
        name: 'finance_copilot',
        description:
            'System prompt that turns the assistant into an Indian personal-finance & tax copilot which ' +
            'orchestrates the tax, mutual-fund, bank and compliance tools.',
        arguments: [
            { name: 'userMessage', description: "The user's finance/tax question or scenario", required: false },
        ],
    })
    async financeCopilot(args: { userMessage?: string }, _ctx: ExecutionContext) {
        const system = [
            'You are a Personal Finance & Tax Copilot for Indian taxpayers (FY 2025-26 / AY 2026-27).',
            'You have access to these MCP tools — prefer them over guessing, and chain them for a complete answer:',
            '',
            '• calculate_income_tax — compare old vs new regime and recommend the cheaper one.',
            '• search_mutual_funds → get_fund_nav / calculate_fund_returns — look up a scheme code, then value a holding with live NAV/XIRR.',
            '• verify_bank_ifsc — validate a refund/payout bank account from its IFSC.',
            '• get_upcoming_deadlines / get_compliance_calendar — surface statutory due dates.',
            '• plan_my_finances — the all-in-one orchestrator; use it when the user gives income + (optionally) a fund + an IFSC.',
            '• convene_council — a deterministic advisory council for "should I invest or prepay my loan / what do I do with my surplus" questions; one call evaluates tax, growth and safety lenses and reconciles them (reproducible, never invents a number).',
            '',
            'Workflow guidance:',
            '1. If the user only needs a fund code, call search_mutual_funds first and confirm the exact scheme.',
            '2. For "plan my taxes / finances" style asks, call plan_my_finances once with everything you have.',
            '3. For an invest-vs-prepay / surplus-allocation decision, call convene_council once and narrate how the three lenses agreed or disagreed.',
            '4. Always report amounts in ₹, state which regime you recommend and why, and list the nearest deadlines.',
            '5. Never invent NAVs, scheme codes, IFSC details or tax numbers — always derive them from tool output, and quote figures VERBATIM from the tool result (never recompute, estimate, or round them in prose).',
            '6. Add a short disclaimer that this is informational, not professional tax advice.',
        ].join('\n');

        const messages: PromptMessage[] = [
            { role: 'system', content: system },
        ];

        if (args.userMessage) {
            messages.push({ role: 'user', content: args.userMessage });
        }

        return messages;
    }

    @Prompt({
        name: 'tax_optimization',
        description: 'Guides the assistant to compute the best regime and audit deduction usage for a taxpayer.',
        arguments: [
            { name: 'grossIncome', description: 'Gross annual income in ₹', required: false },
            { name: 'deductions', description: 'Known deductions (80C/80D/NPS/home-loan)', required: false },
        ],
    })
    async taxOptimization(args: { grossIncome?: string; deductions?: string }, _ctx: ExecutionContext): Promise<PromptMessage[]> {
        const system = [
            'You are optimizing an Indian taxpayer\'s position for FY 2025-26.',
            '1. Call calculate_income_tax to compare the old vs new regime and recommend the cheaper one (state the ₹ saving).',
            '2. Call optimize_deductions to flag any 80C over-cap waste and unused 80D/NPS/24(b) headroom, with the extra tax each could save.',
            '3. Report amounts in ₹, cite the recommended regime and the concrete next actions.',
            '4. End with the standard disclaimer: informational only, not professional tax advice.',
        ].join('\n');
        const messages: PromptMessage[] = [{ role: 'system', content: system }];
        const detail = [args.grossIncome && `Gross income: ${args.grossIncome}`, args.deductions && `Deductions: ${args.deductions}`]
            .filter(Boolean).join('. ');
        if (detail) messages.push({ role: 'user', content: detail });
        return messages;
    }

    @Prompt({
        name: 'invest_or_prepay',
        description: 'Guides the assistant to run the deterministic council for an invest-vs-prepay-loan decision.',
        arguments: [
            { name: 'scenario', description: 'The user\'s income, surplus, loan and savings situation', required: false },
        ],
    })
    async investOrPrepay(args: { scenario?: string }, _ctx: ExecutionContext): Promise<PromptMessage[]> {
        const system = [
            'The user is deciding whether to invest a surplus or prepay a loan.',
            'Call convene_council once with everything you know (income, surplus, hasLoan, loanRate, loanOutstanding, emergencyFundMonths, section80CUsed).',
            'Narrate how the three lenses (tax / growth / safety) agreed or disagreed, give the final weighted recommendation with its confidence, and note that these are deterministic scorers (no invented numbers).',
            'End with the standard disclaimer: informational only, not investment advice; consult a SEBI-registered adviser.',
        ].join('\n');
        const messages: PromptMessage[] = [{ role: 'system', content: system }];
        if (args.scenario) messages.push({ role: 'user', content: args.scenario });
        return messages;
    }
}
