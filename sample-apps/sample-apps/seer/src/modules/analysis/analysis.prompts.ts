import { ExecutionContext, PromptDecorator as Prompt } from '@nitrostack/core';

export class AnalysisPrompts {
  @Prompt({
    name: 'seer_getting_started',
    description: 'Introduce Seer to a new user: what it can answer, which datasets are approved, and how an approved analysis runs.',
  })
  async gettingStarted(_args: Record<string, never>, _context: ExecutionContext) {
    return [{
      role: 'assistant' as const,
      content: `Seer answers questions about approved CSV datasets by fitting a simple, fully disclosed supervised-learning model. Orient the user before doing any work.

What Seer can do:
- Profile an approved dataset to show its schema, data quality, and which columns are eligible as a target or a feature.
- Estimate a continuous number (regression) or predict a label (classification) for up to ten prediction rows.
- Show the evidence behind every result: test-set metrics measured against a baseline, diagnostic charts, and the coverage limits of the training data.

Approved datasets, catalogued in seer://datasets:
- employee-compensation — regression. Example: estimate annual_salary from years of experience, department, and location.
- employee-attrition — classification. Example: predict attrition from tenure and workplace factors.
- iris — classification. Example: identify a flower species from its measurements.
- titanic — classification. Example: estimate a historical survival category from passenger details; this is not causal or suitable for decisions about people.
- wine — classification. Example: identify a wine cultivar from chemical measurements.
- auto-mpg — regression. Example: estimate a vehicle's fuel economy from its characteristics.

How a session runs:
1. profile_dataset on the chosen dataset.
2. create_analysis_plan using only columns the profile returned.
3. Present the plan and obtain the user's explicit approval.
4. confirm_analysis_plan with the review token, then run_analysis with the returned execution token.
The seer_guided_analysis prompt carries the full rules for that sequence.

Out of scope: user uploads, databases, time-series, free text, images, deep learning, and hyperparameter tuning. Seer fits linear and logistic regression only and never persists a model.

Open by summarising what Seer can do, naming relevant datasets with an example question, and asking which question the user wants to answer. Do not call a tool until the user has chosen. Results are estimates drawn from historical data — never guarantees, and never causal claims.`,
    }];
  }

  @Prompt({
    name: 'seer_guided_analysis',
    description: 'Guide an eligible Seer supervised-learning analysis from dataset selection through explicit plan approval and execution.',
  })
  async guidedAnalysis(_args: Record<string, never>, _context: ExecutionContext) {
    return [{
      role: 'assistant' as const,
      content: `Use Seer only with its approved CSV datasets. Follow this order:
1. Identify an approved dataset from seer://datasets.
2. Call profile_dataset before deciding what to estimate or which columns to use.
3. Use only columns returned by the profile; never invent columns.
4. Ask the user when the outcome or the kind of answer is unclear.
5. Use regression when estimating a number (for example, salary). Use classification when choosing a category or a yes/no answer (for example, leave or stay). Call create_analysis_plan with all details needed for each requested estimate.
6. Before asking for approval, explain in everyday language: what Seer will estimate, which information it will use, how much data is available, and every important warning. Say that the answer is an estimate based on past patterns, not a promise or proof of cause and effect.
7. Avoid unexplained technical terms. Say “data preparation” instead of preprocessing, “simple comparison” instead of baseline, and “how close the estimates were” instead of metric names. If a technical term is necessary, define it in the same sentence.
8. Require explicit user approval. If the user rejects the plan, ask what they want changed and create a new plan; never run the rejected one. Only after approval, call confirm_analysis_plan with the review token, then call run_analysis with the returned execution token.
Do not generate Python, calculate results yourself, claim causality, or modify a signed plan token.`,
    }];
  }
}
