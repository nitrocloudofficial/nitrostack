/**
 * Reference Range Resource
 *
 * Exposes the reference-range dataset (normal/critical ranges per test)
 * as an MCP resource so it is inspectable in NitroStudio, separate from
 * the internal lookup used by the flag_critical tool.
 */

import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import { referenceRanges } from './reference-ranges.js';

export class ReferenceRangeResources {
  @Resource({
    uri: 'labs://reference-ranges',
    name: 'Lab Reference Ranges',
    description: 'Normal and critical reference ranges for each supported lab test, grouped by panel (CBC, KFT, LFT, Lipid, Glucose, Thyroid). Used by flag_critical to classify results.',
    mimeType: 'application/json',
    examples: {
      response: JSON.parse(JSON.stringify({ ranges: referenceRanges }))
    }
  })
  async getReferenceRanges(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Fetching lab reference ranges resource');

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({ ranges: referenceRanges }, null, 2)
      }]
    };
  }
}
