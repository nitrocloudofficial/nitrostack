import { ToolDecorator as Tool, ExecutionContext } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { CheckSchemeEligibilityInput, EligibilityResult, Scheme } from '../../shared/contracts.js';
import { evaluateEligibility } from './eligibility.engine.js';

// Resolve data/ relative to THIS module, not process.cwd(), so it works in the
// deployed artifact where cwd is unreliable. Matches knowledge.resources.ts.
const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(MODULE_DIR, '..', '..', '..', 'data');

export class EligibilityTools {
  @Tool({
    name: 'check_scheme_eligibility',
    description: 'Evaluate all 7 government schemes (PMJDY, APY, PMJJBY, PMSBY, SSY, SCSS, NPS) against an applicant profile and return eligible and ineligible schemes with named reasons.',
    inputSchema: CheckSchemeEligibilityInput
  })
  async checkSchemeEligibility(input: CheckSchemeEligibilityInput, ctx: ExecutionContext): Promise<EligibilityResult> {
    ctx.logger.info('check_scheme_eligibility called', { input });

    const file = path.join(DATA_DIR, 'schemes.json');
    const schemes = JSON.parse(fs.readFileSync(file, 'utf-8')) as Scheme[];

    const result = evaluateEligibility(schemes, input);

    ctx.logger.info('check_scheme_eligibility result', {
      eligibleCount: result.eligible.length,
      ineligibleCount: result.ineligible.length
    });

    return result;
  }
}
