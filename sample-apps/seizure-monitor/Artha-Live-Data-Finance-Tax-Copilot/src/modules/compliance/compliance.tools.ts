import { ToolDecorator as Tool, Widget, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { ComplianceService } from './compliance.service.js';

const UpcomingSchema = z.object({
    withinDays: z.number().int().min(1).max(730).optional().describe('Only include deadlines within this many days from today'),
    limit: z.number().int().min(1).max(50).optional().describe('Maximum number of deadlines to return'),
});

const CalendarSchema = z.object({
    category: z.enum(['ITR', 'Advance Tax', 'TDS', 'Investment', 'Audit', 'GST']).optional().describe('Filter the calendar to a single category'),
});

@Injectable({ deps: [ComplianceService] })
export class ComplianceTools {
    constructor(private readonly complianceService: ComplianceService) { }

    @Tool({
        name: 'get_upcoming_deadlines',
        description:
            'List upcoming Indian tax & compliance deadlines (ITR filing, advance tax, tax-saving investment cut-offs) ' +
            'for AY 2026-27 / FY 2026-27, sorted soonest-first with the number of days remaining. ' +
            'Use this to remind a taxpayer what is due next.',
        inputSchema: UpcomingSchema,
        examples: {
            request: { withinDays: 120 },
            response: {
                asOf: '2026-07-26',
                count: 2,
                deadlines: [
                    {
                        id: 'itr-nonaudit-ay2627',
                        title: 'File ITR for AY 2026-27 (non-audit individuals)',
                        category: 'ITR',
                        dueDate: '2026-07-31',
                        daysRemaining: 5,
                    },
                ],
            },
        },
    })
    @Widget('compliance-calendar')
    async getUpcomingDeadlines(args: z.infer<typeof UpcomingSchema>, ctx: ExecutionContext) {
        const now = new Date();
        ctx.logger.info('Fetching upcoming deadlines', { withinDays: args.withinDays });
        const deadlines = this.complianceService.getUpcoming({
            from: now,
            withinDays: args.withinDays,
            limit: args.limit,
        });
        return {
            asOf: now.toISOString().slice(0, 10),
            count: deadlines.length,
            deadlines,
        };
    }

    @Tool({
        name: 'get_compliance_calendar',
        description:
            'Get the full Indian tax compliance calendar (all statutory due dates), optionally filtered by category ' +
            '(ITR, Advance Tax, TDS, Investment, Audit, GST).',
        inputSchema: CalendarSchema,
        examples: {
            request: { category: 'Advance Tax' },
            response: {
                count: 3,
                events: [
                    {
                        id: 'advtax-q2-fy2627',
                        title: 'Advance Tax — 2nd instalment (45% cumulative)',
                        category: 'Advance Tax',
                        dueDate: '2026-09-15',
                    },
                ],
            },
        },
    })
    @Widget('compliance-list')
    async getComplianceCalendar(args: z.infer<typeof CalendarSchema>, ctx: ExecutionContext) {
        ctx.logger.info('Fetching compliance calendar', { category: args.category });
        const events = args.category
            ? this.complianceService.getByCategory(args.category)
            : this.complianceService.getAll();
        return { count: events.length, events };
    }
}
