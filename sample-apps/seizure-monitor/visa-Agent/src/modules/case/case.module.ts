import { Module } from '@nitrostack/core';
import { CaseTools } from './case.tools.js';
import { VisaCaseService } from './case.service.js';

/**
 * Visa Case Module
 *
 * First vertical slice of the Visa Case Module described in
 * docs/MODULES.md §3.1. Owns only case_start and case_get, backed by an
 * in-memory VisaCaseService. No persistence, audit, events, tasks,
 * approvals, or notifications yet — see TODOs in case.service.ts and
 * case.tools.ts for what remains before this matches the target
 * architecture in docs/ARCHITECTURE.md and docs/MODULES.md.
 *
 * `exports: [VisaCaseService]` makes the published Case Service contract
 * available to other modules via NitroStack dependency injection (see
 * docs/MODULES.md §1 "Dependency Direction" / §6 Shared Services), the
 * same pattern the Onboarding Module (`src/modules/onboarding/`) uses to
 * invoke case_start's underlying service directly instead of over HTTP or
 * a tool-to-tool call.
 */
@Module({
    name: 'case',
    description: 'Visa Case Module (first vertical slice): in-memory case creation and retrieval',
    controllers: [CaseTools],
    providers: [VisaCaseService],
    exports: [VisaCaseService]
})
export class CaseModule { }
