/**
 * Claims Module
 * 
 * Registers all claim-related tools, resources, and prompts.
 */

import { Module } from '@nitrostack/core';
import { AssessClaimRouteTool } from './assess-claim-route.tool.js';
import { GetClaimProcedureTool } from './get-claim-procedure.tool.js';
import { BuildDocumentChecklistTool } from './build-document-checklist.tool.js';
import { CheckDelayCompensationTool } from './check-delay-compensation.tool.js';
import { ResolveBankBranchTool } from './resolve-bank-branch.tool.js';
import { InstitutionsRegistryResource } from './institutions-registry.resource.js';
import { NomineeVsHeirResource } from './nominee-vs-heir.resource.js';
import { UnclaimedAssetsStatsResource } from './unclaimed-assets-stats.resource.js';
import { BereavementIntakePrompt } from './bereavement-intake.prompt.js';

@Module({
  name: 'claims',
  description: 'Claim Navigator — tools, resources, and prompts for deceased asset claims',
  controllers: [
    AssessClaimRouteTool,
    GetClaimProcedureTool,
    BuildDocumentChecklistTool,
    CheckDelayCompensationTool,
    ResolveBankBranchTool,
    InstitutionsRegistryResource,
    NomineeVsHeirResource,
    UnclaimedAssetsStatsResource,
    BereavementIntakePrompt,
  ],
})
export class ClaimsModule {}
