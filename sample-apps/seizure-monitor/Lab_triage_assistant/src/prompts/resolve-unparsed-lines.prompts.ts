/**
 * Resolve Unparsed Lines Prompt
 *
 * parse_labs is deterministic: it only matches a line if the test name
 * exactly matches a canonical name or one of its known aliases. Real
 * reports (especially OCR'd ones) often have typos, unusual phrasing, or
 * aliases we didn't think to list. This prompt hands parse_labs's
 * unparsedLines to the calling agent, grounded in the exact list of
 * canonical tests/aliases we support, so it can use its own reasoning to
 * spot an obvious match — e.g. "Hemglobin" or "S. Creatinine" — and
 * rewrite it in the format parse_labs expects, then re-run parse_labs.
 *
 * Deliberately does NOT invent new tests or reference ranges: a line the
 * agent can't confidently map to one of the listed canonical tests
 * should be left out and reported back as unsupported, not guessed at.
 */

import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';
import { CANONICAL_TESTS } from '../canonicalTests.js';

interface PromptMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class ResolveUnparsedLinesPrompts {
  @Prompt({
    name: 'resolve_unparsed_lines',
    description: "When parse_labs returns unparsedLines, use this to have the agent try to match each line to a known canonical test (typo/phrasing fix) using its own reasoning, then re-run parse_labs. Never invents a test or reference range that isn't already supported.",
    arguments: [
      {
        name: 'unparsedLines',
        description: 'JSON array string of the unparsedLines from parse_labs, e.g. \'["Hemglobin - 13.5 g/dL", "S. Creatinine: 1.5"]\'',
        required: true
      }
    ]
  })
  async resolveUnparsedLines(
    args: { unparsedLines: string },
    ctx: ExecutionContext
  ): Promise<PromptMessage[]> {
    const lines: string[] = JSON.parse(args.unparsedLines);
    ctx.logger.info(`Building resolve_unparsed_lines prompt for ${lines.length} unparsed line(s)`);

    const knownTests = Object.entries(CANONICAL_TESTS)
      .map(([name, test]) => `- ${name} (aliases: ${test.aliases.join(', ')})`)
      .join('\n');

    const instructions = `The lab report parser could not recognize the following line(s):
${lines.map((l) => `- "${l}"`).join('\n')}

Here is the exact list of tests this system supports, with their known aliases:
${knownTests}

For each unrecognized line:
1. Decide if it's plausibly one of the tests listed above, written differently (a typo, an OCR misread, an abbreviation or phrasing we don't have listed, e.g. "Hemglobin" for Hemoglobin, or "S. Creatinine" for Creatinine).
2. If yes, rewrite it in the exact format "CanonicalName : value unit" using the canonical name from the list above, then call the parse_labs tool again with a reportText containing all the corrected lines (combined with any lines that already parsed successfully).
3. If a line is not plausibly one of the tests listed above, do not guess or invent a reference range for it — leave it out and instead tell the patient plainly that this system doesn't have reference data for that specific test, and to ask their doctor about it directly.
4. Never fabricate a normal or critical range for a test that isn't in the list above.`;

    return [
      {
        role: 'user',
        content: instructions
      }
    ];
  }
}
