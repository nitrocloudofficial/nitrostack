import { ToolDecorator as Tool, Widget, ExecutionContext, z, UseGuards, Injectable } from '@nitrostack/core';
import { OAuthGuard } from '../../guards/oauth.guard.js';
import { VisaCaseService } from './case.service.js';

/**
 * CaseTools
 *
 * First vertical slice of the Visa Case Module's MCP surface
 * (docs/TOOLS.md §4.1). Only `case_start` and `case_get` are implemented.
 *
 * TODO(visa-case): `case_update` and controlled lifecycle transitions
 * (docs/TOOLS.md) are not implemented in this slice.
 * TODO(visa-case): required scopes per docs/ARCHITECTURE.md §15 are
 * `case:write` for case_start and `case:read` for case_get. OAuthGuard is
 * applied for consistency with the rest of the codebase, but no
 * fine-grained scope or tenant check is enforced yet — do not treat this
 * as production authorization.
 * TODO(visa-case): no audit logging, event emission, or task creation
 * (Case Intake task) yet — see docs/EVENTS.md (`case.created`) and
 * docs/TASKS.md (`case_intake`).
 */
@Injectable({ deps: [VisaCaseService] })
export class CaseTools {
    constructor(private visaCaseService: VisaCaseService) { }

    @Tool({
        name: 'case_start',
        description: 'Creates a new visa case in DRAFT status for a given destination country, applicant nationality, and visa type. In-memory only (no persistence). This is a first vertical slice: it does not capture consent, enforce approval gates, or emit audit/events yet.',
        inputSchema: z.object({
            destinationCountry: z.string().min(2).describe('Destination country for the visa application (e.g., "France", "FR")'),
            nationality: z.string().min(2).describe('Applicant nationality or country of residence (e.g., "United States", "US")'),
            visaType: z.string().min(2).describe('Type of visa being applied for (e.g., "tourist", "work", "student")')
        }),
        examples: {
            request: {
                destinationCountry: 'France',
                nationality: 'United States',
                visaType: 'tourist'
            },
            response: {
                caseId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
                status: 'DRAFT',
                createdAt: '2026-07-25T12:00:00.000Z',
                nextStep: 'Complete onboarding.'
            }
        }
    })
    @Widget('migrate-ease')
    @UseGuards(OAuthGuard)
    async caseStart(input: any, ctx: ExecutionContext) {
        ctx.logger.info('Starting visa case', {
            user: ctx.auth?.subject,
            destinationCountry: input.destinationCountry,
            nationality: input.nationality,
            visaType: input.visaType
        });

        const record = await this.visaCaseService.createCase({
            destinationCountry: input.destinationCountry,
            nationality: input.nationality,
            visaType: input.visaType
        });

        ctx.logger.info('Visa case started', {
            user: ctx.auth?.subject,
            caseId: record.caseId
        });

        return {
            caseId: record.caseId,
            status: record.status,
            createdAt: record.createdAt,
            nextStep: record.nextStep
        };
    }

    @Tool({
        name: 'case_get',
        description: 'Retrieves a previously created visa case by ID. In-memory only: cases created before a server restart will no longer be found.',
        inputSchema: z.object({
            caseId: z.string().describe('The case ID returned by case_start')
        }),
        examples: {
            request: {
                caseId: '3fa85f64-5717-4562-b3fc-2c963f66afa6'
            },
            response: {
                caseId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
                destinationCountry: 'France',
                nationality: 'United States',
                visaType: 'tourist',
                status: 'DRAFT',
                createdAt: '2026-07-25T12:00:00.000Z',
                nextStep: 'Complete onboarding.'
            }
        }
    })
    @UseGuards(OAuthGuard)
    async caseGet(input: any, ctx: ExecutionContext) {
        ctx.logger.info('Getting visa case', {
            user: ctx.auth?.subject,
            caseId: input.caseId
        });

        const record = await this.visaCaseService.getCase(input.caseId);

        return {
            caseId: record.caseId,
            destinationCountry: record.destinationCountry,
            nationality: record.nationality,
            visaType: record.visaType,
            status: record.status,
            createdAt: record.createdAt,
            nextStep: record.nextStep
        };
    }
}
