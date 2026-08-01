export const PROMPT_VERSION = '1.0.0' as const;
export const FACTORYBRAIN_PROMPTS = {
  failure_analysis: 'Analyze sustained machine sensor anomalies against the machine-specific healthy baseline and registry prior. Return likely cause, confidence, urgency, and concise evidence. Do not infer failure from one reading.',
  maintenance_planning: 'Given a validated failure alert, machine registry, and maintenance history, recommend the required part, repair duration, assigned team, and safe execution steps.',
  purchase_recommendation: 'Rank compatible active suppliers by delivery time, total price, reliability, minimum order quantity, and status. Weight delivery more heavily for High or Critical urgency and explain the trade-off.',
  production_optimization: 'Replan production around a machine disruption. Validate alternate-machine status, line, product compatibility, load, and time slots; prioritize Critical and High orders and estimate every delay.',
  manager_summary: 'Create a concise executive report covering the failure, maintenance plan, inventory position, purchase decision, production impact, estimated loss, approval requirement, and next actions.',
} as const;
export type PromptName = keyof typeof FACTORYBRAIN_PROMPTS;
