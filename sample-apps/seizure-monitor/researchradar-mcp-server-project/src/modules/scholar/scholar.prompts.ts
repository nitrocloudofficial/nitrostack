import { PromptDecorator as Prompt, z, ExecutionContext, Injectable } from '@nitrostack/core';

@Injectable({ deps: [] })
export class ScholarPrompts {
  // ============================================================================
  // Prompt 1: research_gap_finder
  // ============================================================================

  @Prompt({
    name: 'research_gap_finder',
    description:
      'Analyse a set of papers on a topic and identify research gaps, ' +
      'underexplored areas, and future research directions. ' +
      'Returns a structured prompt for the model to complete gap analysis.',
    arguments: [
      {
        name: 'topic',
        description: 'The research topic or question being explored. Example: "transformer attention mechanisms in NLP"',
        required: true,
      },
      {
        name: 'paper_summaries',
        description:
          'Titles and years of relevant papers, comma or newline-separated. ' +
          'Example: "BERT: Pre-training of Deep Bidirectional Transformers (2019), Attention Is All You Need (2017)"',
        required: true,
      },
      {
        name: 'domain_context',
        description:
          'Optional domain or regional context to focus gap analysis. ' +
          'Examples: "Indian higher education", "low-resource NLP", "rural healthcare". ' +
          'This biases the AI toward identifying gaps specific to this context.',
        required: false,
      },
    ],
  })
  async researchGapFinder(
    args: { topic: string; paper_summaries: string; domain_context?: string },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Building research_gap_finder prompt', { topic: args.topic });

    const { topic, paper_summaries, domain_context } = args;

    const contextClause = domain_context
      ? `\n\nContext to prioritise: **${domain_context}** — bias your gap identification toward this setting.`
      : '';

    const userMessage = `
You are a senior academic research analyst. Based on the papers listed below, conduct a structured research gap analysis on the topic: **${topic}**.${contextClause}

**Papers reviewed:**
${paper_summaries}

Produce your analysis in exactly this structure:

## 1. What This Literature Covers Well
Identify 2–3 dominant themes, methodological approaches, or findings that the existing body of work addresses comprehensively.

## 2. Research Gaps Identified
List 3–5 specific gaps — underexplored populations, geographies, methods, contexts, or problem formulations that the literature does not adequately address. For each gap, explain *why* it matters.

## 3. Future Research Directions
Suggest 2–3 concrete, actionable research directions that would fill the most important gaps. Be specific: name methods, datasets, or contexts where relevant.

## 4. Methodological Biases & Limitations
Comment on any systematic biases in how the existing research was conducted — e.g. Western-centric datasets, lab settings vs real-world, overreliance on a single method, publication bias toward positive results.

Keep the tone specific and grounded. Avoid generic statements. Reference the papers listed where possible.
`.trim();

    return [{ role: 'user' as const, content: userMessage }];
  }

  // ============================================================================
  // Prompt 2: literature_review_summary
  // ============================================================================

  @Prompt({
    name: 'literature_review_summary',
    description:
      'Generate a formal academic literature review section (3–4 paragraphs) from a set of papers. ' +
      'Synthesises across papers by theme, highlights agreements and contradictions, ' +
      'and motivates further research.',
    arguments: [
      {
        name: 'topic',
        description: 'Research topic for the literature review. Example: "Large Language Models in Education"',
        required: true,
      },
      {
        name: 'papers_json',
        description:
          'JSON array string of papers, each with fields: title, year, authors (array), abstract_snippet. ' +
          'Example: \'[{"title":"BERT","year":2019,"authors":["Devlin et al."],"abstract_snippet":"We introduce BERT..."}]\'',
        required: true,
      },
    ],
  })
  async literatureReviewSummary(
    args: { topic: string; papers_json: string },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Building literature_review_summary prompt', { topic: args.topic });

    const { topic, papers_json } = args;

    let parsedPapers: Array<{ title: string; year: number; authors: string[]; abstract_snippet: string }> = [];
    try {
      parsedPapers = JSON.parse(papers_json);
    } catch {
      throw new Error('papers_json must be a valid JSON array string. Check the format and try again.');
    }

    const paperList = parsedPapers
      .map((p, i) => `${i + 1}. **${p.title}** (${p.authors?.[0] ?? 'Unknown'}, ${p.year})\n   ${p.abstract_snippet}`)
      .join('\n\n');

    const userMessage = `
You are an academic writing assistant helping draft a formal literature review for a research paper on: **${topic}**.

Below are the papers to synthesise:

${paperList}

Write a literature review of **3–4 paragraphs** following these strict conventions:

1. **Synthesise across papers — do not summarise each paper individually.** Group findings by theme, not by paper.
2. **Organise by theme**, not chronologically — identify 2–3 thematic clusters and structure paragraphs around them.
3. **Surface agreements and contradictions** — where do papers agree? Where do findings conflict and why?
4. **Use formal academic citation style**: (Author et al., Year) for each claim.
5. **End with a forward-looking paragraph** that motivates further research and naturally leads into a study's contribution.
6. **Tone**: Formal, precise, third-person. No first-person ("I", "we") unless the final paragraph transitions to the study's contribution.

Do not include a title or section header — begin directly with the first paragraph.
`.trim();

    return [{ role: 'user' as const, content: userMessage }];
  }

  // ============================================================================
  // Prompt 3: commercialization_pitch
  // ============================================================================

  @Prompt({
    name: 'commercialization_pitch',
    description:
      'Generate an investor-ready 1-page pitch narrative for commercialising university research. ' +
      'Takes paper abstract and commercialization analysis, outputs a structured pitch for approaching ' +
      'university incubators, angel investors, or corporate R&D partnerships.',
    arguments: [
      {
        name: 'title',
        description: 'Research paper title',
        required: true,
      },
      {
        name: 'abstract',
        description: 'Full abstract of the research paper',
        required: true,
      },
      {
        name: 'target_industries',
        description: 'Comma-separated list of target industries from commercialize_research tool. Example: "Healthcare & MedTech, AI & SaaS"',
        required: true,
      },
      {
        name: 'startup_ideas',
        description: 'Key startup idea(s) from the commercialize_research tool output',
        required: true,
      },
      {
        name: 'market_potential',
        description: 'Market potential tier and TAM estimate from commercialize_research. Example: "High (₹500Cr–₹5000Cr TAM)"',
        required: true,
      },
      {
        name: 'team_context',
        description:
          'Optional: describe the research team background, university affiliation, or domain expertise. ' +
          'Example: "PhD researcher in ML from Amrita School of Engineering, 5 years of industry experience in NLP"',
        required: false,
      },
    ],
  })
  async commercializationPitch(
    args: {
      title: string;
      abstract: string;
      target_industries: string;
      startup_ideas: string;
      market_potential: string;
      team_context?: string;
    },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Building commercialization_pitch prompt', { title: args.title });

    const { title, abstract, target_industries, startup_ideas, market_potential, team_context } = args;

    const teamClause = team_context
      ? `\n\n**Team context:** ${team_context} — weave this into the Team & Unfair Advantage section.`
      : '';

    const userMessage = `
You are an entrepreneurship advisor helping a university researcher write a compelling 1-page investor pitch narrative for commercialising their research.

**Research Title:** ${title}

**Abstract:**
${abstract}

**Target Industries:** ${target_industries}

**Startup Idea:** ${startup_ideas}

**Market Potential:** ${market_potential}
${teamClause}

Write a structured 1-page pitch narrative with the following sections. Keep each section to 2–4 sentences — tight and punchy, not academic.

## The Problem
What pain point does this research address? Why does it matter to industry and customers today?

## The Research Breakthrough
What does this paper prove or demonstrate that wasn't possible before? Explain for a non-specialist investor.

## The Product Opportunity
Describe the core product or platform that could be built from this research. Who buys it and how? What problem does it solve for them?

## Market Potential
Size the opportunity. Reference the TAM estimate. Name 1–2 comparable companies as benchmarks.

## Unfair Advantage
Why is this research team uniquely positioned to win? (IP, domain expertise, university backing, data access, early customer relationships, etc.)

## The Ask
What are you seeking? (Incubation, seed funding, corporate partnership, licensing deal). State a specific amount or resource if possible.

**Tone:** Confident, clear, commercially grounded. Avoid jargon. This is for an investor who reads 50 pitches a week.
`.trim();

    return [{ role: 'user' as const, content: userMessage }];
  }
}
