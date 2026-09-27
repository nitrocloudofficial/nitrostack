import { ToolDecorator as Tool, ExecutionContext } from '@nitrostack/core';
import { ExplainConceptInput, ExplainConceptOutput } from '../../shared/contracts.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Resolve data/ relative to this module (dist/modules/explain/), not cwd —
// cwd is unreliable in deployed artifacts. Matches knowledge.resources.ts.
const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(MODULE_DIR, '..', '..', '..', 'data');

/**
 * GlossaryEntry represents the full structure of a term in glossary.json.
 */
interface GlossaryEntry {
  term: string;
  definition: string;
  explanation: string;
  example: string;
  relatedTerms: string[];
  category: string;
}

/**
 * Load glossary.json from data directory.
 * Cached at module level — no repeated file I/O.
 */
let _glossary: GlossaryEntry[] | null = null;
function getGlossary(): GlossaryEntry[] {
  if (!_glossary) {
    const file = path.join(DATA_DIR, 'glossary.json');
    const raw = fs.readFileSync(file, 'utf-8');
    _glossary = JSON.parse(raw) as GlossaryEntry[];
  }
  return _glossary;
}

export class ExplainTools {
  @Tool({
    name: 'explain_financial_concept',
    description: 'Look up and explain a financial term from the FinBridge glossary. Provides a beginner-friendly definition, explanation, real-world example, and related terms. Returns a structured error if the term is not found.',
    inputSchema: ExplainConceptInput
  })
  async explainFinancialConcept(input: any, ctx: ExecutionContext) {
    ctx.logger.info('explain_financial_concept called', { input });

    const glossary = getGlossary();
    const searchTerm = (input.term as string).trim().toLowerCase();

    // Case-insensitive exact match first, then partial match
    let entry = glossary.find(e => e.term.toLowerCase() === searchTerm);

    if (!entry) {
      // Try partial/contains match
      entry = glossary.find(e => e.term.toLowerCase().includes(searchTerm) || searchTerm.includes(e.term.toLowerCase()));
    }

    if (!entry) {
      // Return structured error — not a crash
      const availableTerms = glossary.map(e => e.term).join(', ');
      return {
        term: input.term,
        explanation: `The term "${input.term}" was not found in the FinBridge glossary.`,
        example: `Available terms: ${availableTerms}. Please try one of these or rephrase your query.`,
        risk_note: 'Term not found. Please consult official financial resources for definitions not in the glossary.',
        educational_only: true as const
      };
    }

    return {
      term: entry.term,
      definition: entry.definition,
      explanation: entry.explanation,
      example: entry.example,
      relatedTerms: entry.relatedTerms,
      category: entry.category,
      risk_note: 'This explanation is for educational purposes only. Consult a SEBI-registered financial advisor for personalized advice.',
      educational_only: true as const
    };
  }
}
