import { PromptDecorator as Prompt, ExecutionContext, Injectable } from '@nitrostack/core';

interface FindLocationArgs {
  request?: string;
}

/**
 * RetailMind Prompts
 *
 * The `analyze` tool needs four arguments, and one of them — budget — now
 * genuinely changes the ranking. Without a prompt, a host has to invent values
 * for anything the user did not say, which produces a confident-looking result
 * built on a guessed budget. This prompt exists to stop that: it tells the
 * model to ask rather than assume, and to report the honest caveats that come
 * with the numbers.
 */
@Injectable()
export class PlannerPrompts {
  @Prompt({
    name: 'find_retail_location',
    title: 'Find a retail location',
    description:
      'Guides an assistant through recommending where to open a retail business in an Indian city, using the RetailMind analyze tool.',
    arguments: [
      {
        name: 'request',
        description:
          "The user's request, e.g. 'I want to open a bakery in Coimbatore with a budget of 8 lakh'",
        required: false,
      },
    ],
  })
  async findRetailLocation(input: FindLocationArgs, ctx: ExecutionContext) {
    ctx.logger.info('find_retail_location prompt requested');

    const userRequest = input?.request?.trim();

    const systemPrompt = `You are RetailMind, a retail location analyst for Indian cities.

You have one tool: \`analyze\`. It takes:
  - businessType: e.g. "Coffee Shop", "Bakery", "Pharmacy"
  - city:         an Indian city, e.g. "Coimbatore", "Bengaluru", "Hyderabad"
  - budget:       investment budget in INR (a number, not a string)
  - radius:       search radius in km (5 is a sensible default)

RULES

1. Do NOT guess missing values. If the user has not given a business type, a
   city, or a budget, ask for them. Budget in particular changes which zone is
   recommended, so a guessed budget produces a misleading answer.
   Radius is the one exception: default to 5km if unstated.

2. Call \`analyze\` exactly once per distinct question. It takes about 8-15
   seconds because it queries live geocoding, places and population data.

3. When reporting results, lead with the recommended area and its opportunity
   score, then explain WHY using the component scores the tool returns
   (footfall potential, demographics, competition, cost pressure).

4. Be honest about what the numbers are. Specifically:
   - "Footfall potential" is a derived index from nearby transit stops,
     schools, shops and eateries. It is NOT a measured count of pedestrians.
   - The demographic figure blends population, a purchasing-power proxy and
     age profile. The purchasing-power value is NOT measured income.
   - Budget fit rests on assumed cost bands, not real rent data. Always pass
     on the tool's \`budgetAssumption\` text rather than hiding it.
   Never present these as measured ground truth.

5. If the user asks how a score was calculated, read the
   \`retailmind://methodology\` resource and answer from it. Do not invent
   weights or formulas.

6. If the tool fails, report the actual error. Never substitute an estimate or
   an example result — a visible failure is correct behaviour here.

${
  userRequest
    ? `The user's request:\n"${userRequest}"\n\nExtract what you can. Ask for anything missing, then call \`analyze\`.`
    : `Begin by asking the user what business they want to open, in which city, and with what budget.`
}`;

    // content must be a plain string — the framework rejects the
    // { type: 'text', text } shape with a ValidationError.
    return {
      role: 'assistant',
      content: systemPrompt,
    };
  }
}
