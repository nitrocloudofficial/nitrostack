import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';
import { stateManager } from './bootstrap.js';

export class SymbioForgePrompts {
  @Prompt({
    name: 'ask_symbioforge',
    description: 'Ask SymbioForge — the ecosystem intelligence that explains its own autonomous decisions. Ask why factories were paired, which industry to register next, how self-healing works, or anything about the circular economy cluster.',
    arguments: [
      {
        name: 'question',
        description: 'Your question about the ecosystem (e.g. "Why did you pair the foundry with the glass works?", "Which factory should I register next?")',
        required: true
      }
    ]
  })
  async askSymbioForge(args: { question: string }, ctx: ExecutionContext) {
    ctx.logger.info(`[SymbioForge] AI Persona answering: ${args.question}`);
    const state = stateManager.getState();

    const factorySummary = state.factories.map(f =>
      `${f.id}: ${f.name} (${f.industryType}) — wastes: ${f.declaredWastes.join(', ')} | status: ${f.complianceStatus}`
    ).join('\n');

    const topMatches = state.matches
      .filter(m => m.status === 'Active' || m.status === 'Blueprint Ready')
      .slice(0, 10)
      .map(m => `${m.id}: ${m.sourceFactoryName} → ${m.targetFactoryName} | waste: ${m.wasteStreamName} | CO₂ saved: ${m.co2SavedTonsPerYear}t/yr | savings: ₹${m.savingsInrPerYear}/yr | status: ${m.status}`)
      .join('\n');

    const productSummary = state.products
      .slice(0, 5)
      .map(p => `${p.id}: "${p.name}" — ${p.description} | revenue: ₹${p.revenuePotentialInrPerYear}/yr | status: ${p.status}`)
      .join('\n');

    const chainSummary = state.chains
      .slice(0, 5)
      .map(c => `${c.hops.map(h => h.sourceFactoryName).join(' → ')} → ${c.hops[c.hops.length - 1]?.targetFactoryName || '?'} (${c.hops.length} hops, ${c.totalCo2Saved.toFixed(1)}t CO₂)`)
      .join('\n');

    return [
      {
        role: 'user' as const,
        content: args.question
      },
      {
        role: 'assistant' as const,
        content: `You are **SymbioForge**, an autonomous circular manufacturing intelligence managing an industrial cluster in Coimbatore, India. You have 8 AI agents (Clerk, Scout, Profiler, Matchmaker, Inventor, Auditor, Architect, Sentinel) that work together without human intervention.

Answer the user's question using the live ecosystem data below. Explain your reasoning: why specific factories were paired (chemistry, Haversine distance, volume compatibility), how the matching algorithm scores work (composite of distance, compatibility, volume), and what the environmental/financial impact is. Be specific — cite factory names, waste streams, CO₂ numbers, and INR savings.

**LIVE CLUSTER STATE:**
- Factories: ${state.factories.length} | Matches: ${state.matches.length} | Products: ${state.products.length} | Blueprints: ${state.blueprints.length}
- Circular Score: ${state.circularScore}% | CO₂ Avoided: ${state.totalCo2Avoided}t/yr | Water Saved: ${state.totalWaterSaved}L/yr | Energy Saved: ${state.totalEnergySaved} kWh/yr
- Financial Value: ₹${state.totalFinancialValue}/yr

**FACTORIES:**
${factorySummary}

**TOP ACTIVE MATCHES:**
${topMatches || 'No active matches yet.'}

**PRODUCT CONCEPTS:**
${productSummary || 'No products generated yet.'}

**MULTI-HOP CHAINS:**
${chainSummary || 'No multi-hop chains discovered yet.'}

**USER'S QUESTION:** ${args.question}

Now answer as SymbioForge — confident, data-driven, and specific. If asked which factory to register next, analyze gaps in the waste network and recommend an industry type that would create the most new symbiotic connections.`
      }
    ];
  }
}
