import { ToolDecorator as Tool, Widget, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { MemoryStore } from '../../core/memory/memory.store.js';
import { WritingCheck } from '../../core/memory/session.schema.js';
import { generateId } from '../../utils/id-generator.js';

/**
 * Phase 10: Writing Assistance Tools
 *
 * Checks academic tone, AI-generic phrasing, meaning preservation, and clarity.
 * Returns flags and suggestions - NEVER rewrites silently.
 */
@Injectable({ deps: [MemoryStore] })
export class WritingTools {
  constructor(private memory: MemoryStore) {}

  @Tool({
    name: 'check_writing',
    description: 'Check text for academic tone, AI-generic phrasing, meaning preservation, and clarity',
    inputSchema: z.object({
      section: z.string().describe('Section name (e.g., "Introduction", "Related Work")'),
      text: z.string().describe('Text to check'),
      checkTypes: z.array(z.enum(['tone', 'ai-generic', 'meaning-preserved', 'clarity'])).default(['tone', 'ai-generic', 'clarity']),
      originalText: z.string().optional().describe('Original text for meaning preservation check'),
      sessionId: z.string().optional().describe('Session ID to store results'),
    }),
    invocation: {
      invoking: 'Checking writing quality...',
      invoked: 'Writing check complete'
    },
    examples: {
      request: { section: 'Introduction', text: 'We propose a new method for federated learning. In today\'s world, data privacy is crucial.', checkTypes: ['tone', 'ai-generic', 'clarity'] },
      response: { section: 'Introduction', checksPassed: 1, totalChecks: 3, checks: [{ checkId: 'w1', type: 'tone', passed: true, issues: [], suggestions: [] }, { checkId: 'w2', type: 'ai-generic', passed: false, issues: ['AI-generic phrase: "in today\'s world" (1x)'], suggestions: ['Remove or use "in recent years", "currently"'] }, { checkId: 'w3', type: 'clarity', passed: true, issues: [], suggestions: [] }] }
    }
  })
  @Widget('research-pilot-shell')
  async checkWriting(
    input: {
      section: string;
      text: string;
      checkTypes: ('tone' | 'ai-generic' | 'meaning-preserved' | 'clarity')[];
      originalText?: string;
      sessionId?: string;
    },
    ctx: ExecutionContext
  ) {
    const { section, text, checkTypes, originalText, sessionId } = input;

    ctx.logger.info('Checking writing', { section, checkTypes, textLength: text.length });

    const checks: WritingCheck[] = [];

    for (const type of checkTypes) {
      let check: WritingCheck;

      switch (type) {
        case 'tone':
          check = this.checkTone(section, text);
          break;
        case 'ai-generic':
          check = this.checkAIGeneric(section, text);
          break;
        case 'meaning-preserved':
          check = this.checkMeaningPreserved(section, text, originalText);
          break;
        case 'clarity':
          check = this.checkClarity(section, text);
          break;
      }

      checks.push(check);
    }

    if (sessionId) {
      this.memory.addWritingChecks(sessionId, checks);
    }

    return {
      section,
      checksPassed: checks.filter(c => c.passed).length,
      totalChecks: checks.length,
      checks: checks.map(c => ({
        checkId: c.checkId,
        type: c.checkType,
        passed: c.passed,
        issues: c.issues,
        suggestions: c.suggestions,
      })),
    };
  }

  private checkTone(section: string, text: string): WritingCheck {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check for informal language
    const informalPatterns = [
      { pattern: /\b(don't|can't|won't|isn't|aren't|wasn't|weren't|it's|that's)\b/gi, suggestion: 'Use full forms (do not, cannot, will not, is not, are not, was not, were not, it is, that is)' },
      { pattern: /\b(gonna|wanna|gotta|kinda|sorta)\b/gi, suggestion: 'Use formal forms (going to, want to, got to, kind of, sort of)' },
      { pattern: /\b(a lot|lots of|tons of)\b/gi, suggestion: 'Use "many", "numerous", "a large number of"' },
      { pattern: /\b(i |we |our |my )/gi, suggestion: 'Consider passive voice or impersonal constructions' },
      { pattern: /\b(probably|maybe|might|could be)\b/gi, suggestion: 'Use hedging appropriately: "it is likely that", "may indicate"' },
    ];

    for (const { pattern, suggestion } of informalPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        issues.push(`Found ${matches.length} instance(s) of informal language`);
        suggestions.push(suggestion);
      }
    }

    // Check for first-person usage
    const firstPerson = (text.match(/\b(?:I|we|our|my)\b/gi) || []).length;
    if (firstPerson > 3) {
      issues.push(`High first-person usage (${firstPerson} instances)`);
      suggestions.push('Consider reducing first-person pronouns for formal academic writing');
    }

    return {
      checkId: generateId('write'),
      section,
      originalText: text.slice(0, 200),
      checkType: 'tone',
      passed: issues.length === 0,
      issues,
      suggestions,
      checkedAt: new Date().toISOString(),
    };
  }

  private checkAIGeneric(section: string, text: string): WritingCheck {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Common AI-generic phrases
    const aiPhrases = [
      { phrase: 'delve into', suggestion: 'Use "examine", "investigate", "analyze", "explore"' },
      { phrase: 'crucial role', suggestion: 'Use "important role", "key role", "central role"' },
      { phrase: 'in today\'s world', suggestion: 'Remove or use "in recent years", "currently"' },
      { phrase: 'in the realm of', suggestion: 'Use "in the field of", "within"' },
      { phrase: 'tapestry', suggestion: 'Avoid metaphor; use "complex interplay" or "interconnected factors"' },
      { phrase: 'landscape', suggestion: 'Use "field", "domain", "area" unless referring to geography' },
      { phrase: 'unprecedented', suggestion: 'Be specific about what is new' },
      { phrase: 'paradigm shift', suggestion: 'Describe the actual change' },
      { phrase: 'game-changer', suggestion: 'Use "significant advancement", "transformative"' },
      { phrase: 'revolutionize', suggestion: 'Use "transform", "advance", "improve significantly"' },
      { phrase: 'it is important to note', suggestion: 'Remove filler; state the point directly' },
      { phrase: 'it should be noted that', suggestion: 'Remove filler; state the point directly' },
      { phrase: 'plays a vital role', suggestion: 'Use "is essential for", "is critical to"' },
      { phrase: 'in order to', suggestion: 'Use "to"' },
      { phrase: 'utilize', suggestion: 'Use "use" unless technical context requires "utilize"' },
      { phrase: 'leverage', suggestion: 'Use "use", "employ", "apply" unless financial context' },
      { phrase: 'synergy', suggestion: 'Describe the specific combined effect' },
      { phrase: 'holistic', suggestion: 'Use "comprehensive", "integrated", "complete"' },
      { phrase: 'seamless', suggestion: 'Describe the actual integration experience' },
      { phrase: 'robust', suggestion: 'Be specific: "reliable", "fault-tolerant", "well-tested"' },
    ];

    for (const { phrase, suggestion } of aiPhrases) {
      const regex = new RegExp(phrase, 'gi');
      const matches = text.match(regex);
      if (matches) {
        issues.push(`AI-generic phrase: "${phrase}" (${matches.length}x)`);
        suggestions.push(suggestion);
      }
    }

    // Check sentence structure diversity
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const starts = sentences.map(s => s.trim().split(/\s+/)[0].toLowerCase());
    const uniqueStarts = new Set(starts);
    if (starts.length > 5 && uniqueStarts.size / starts.length < 0.5) {
      issues.push('Repetitive sentence starters');
      suggestions.push('Vary sentence openings (e.g., start with prepositional phrases, subordinate clauses, transitions)');
    }

    return {
      checkId: generateId('write'),
      section,
      originalText: text.slice(0, 200),
      checkType: 'ai-generic',
      passed: issues.length === 0,
      issues,
      suggestions,
      checkedAt: new Date().toISOString(),
    };
  }

  private checkMeaningPreserved(section: string, text: string, originalText?: string): WritingCheck {
    if (!originalText) {
      return {
        checkId: generateId('write'),
        section,
        originalText: text.slice(0, 200),
        checkType: 'meaning-preserved',
        passed: true,
        issues: [],
        suggestions: ['Provide original text for meaning preservation check'],
        checkedAt: new Date().toISOString(),
      };
    }

    const issues: string[] = [];
    const suggestions: string[] = [];

    // Extract key claims from original
    const origClaims = this.extractKeyClaims(originalText);
    const newClaims = this.extractKeyClaims(text);

    // Check if key claims are preserved
    for (const claim of origClaims) {
      const found = newClaims.some(c => this.claimsMatch(claim, c));
      if (!found) {
        issues.push(`Potential claim loss: "${claim.slice(0, 100)}..."`);
        suggestions.push('Verify that this key claim is preserved in the revised text');
      }
    }

    // Check length (excessive condensation may lose nuance)
    const lengthRatio = text.length / originalText.length;
    if (lengthRatio < 0.4) {
      issues.push(`Text significantly condensed (${(lengthRatio * 100).toFixed(0)}% of original)`);
      suggestions.push('Ensure key details and nuance are not lost in compression');
    }

    return {
      checkId: generateId('write'),
      section,
      originalText: text.slice(0, 200),
      checkType: 'meaning-preserved',
      passed: issues.length === 0,
      issues,
      suggestions,
      checkedAt: new Date().toISOString(),
    };
  }

  private extractKeyClaims(text: string): string[] {
    // Simple extraction: sentences with claim-like patterns
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    return sentences.filter(s =>
      /we (find|show|demonstrate|prove|observe|achieve|improve|outperform|propose|introduce|develop)/i.test(s) ||
      /(significant|substantial|notable|remarkable|important) (improvement|gain|reduction|difference|result)/i.test(s) ||
      /(our|the) (method|approach|model|framework|system) (achieves|outperforms|demonstrates|shows)/i.test(s)
    );
  }

  private claimsMatch(claim1: string, claim2: string): boolean {
    const words1 = claim1.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const words2 = claim2.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const overlap = words1.filter(w => words2.includes(w)).length;
    return overlap >= Math.min(words1.length, words2.length) * 0.5;
  }

  private checkClarity(section: string, text: string): WritingCheck {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check sentence length
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const avgLength = sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sentences.length;

    if (avgLength > 30) {
      issues.push(`Long average sentence length (${avgLength.toFixed(1)} words)`);
      suggestions.push('Break long sentences into shorter ones for readability');
    }

    // Check for passive voice overuse
    const passiveCount = (text.match(/\b(?:is|are|was|were|has been|have been|will be)\s+\w+ed\b/gi) || []).length;
    if (passiveCount > sentences.length * 0.3) {
      issues.push(`High passive voice usage (${passiveCount}/${sentences.length} sentences)`);
      suggestions.push('Consider active voice for clarity: "We trained the model" vs "The model was trained"');
    }

    // Check for undefined acronyms
    const acronyms = text.match(/\b[A-Z]{2,}\b/g) || [];
    const definedAcronyms = new Set();
    for (const acronym of acronyms) {
      const pattern = new RegExp(`${acronym}\\s*\\([^)]*${acronym[0]}[^)]*\\)`, 'i');
      if (text.match(pattern)) {
        definedAcronyms.add(acronym);
      }
    }
    const undefinedAcronyms = acronyms.filter(a => !definedAcronyms.has(a));
    if (undefinedAcronyms.length > 0) {
      issues.push(`Undefined acronyms: ${[...new Set(undefinedAcronyms)].join(', ')}`);
      suggestions.push('Define acronyms at first use: "Convolutional Neural Network (CNN)"');
    }

    // Check transition words
    const transitions = ['however', 'therefore', 'furthermore', 'moreover', 'consequently', 'nevertheless', 'thus', 'hence', 'accordingly'];
    const transitionCount = transitions.filter(t => new RegExp(`\\b${t}\\b`, 'i').test(text)).length;
    if (transitionCount === 0 && sentences.length > 3) {
      issues.push('No transition words between sentences/paragraphs');
      suggestions.push('Add transitions to improve flow: however, therefore, furthermore, etc.');
    }

    return {
      checkId: generateId('write'),
      section,
      originalText: text.slice(0, 200),
      checkType: 'clarity',
      passed: issues.length === 0,
      issues,
      suggestions,
      checkedAt: new Date().toISOString(),
    };
  }
}