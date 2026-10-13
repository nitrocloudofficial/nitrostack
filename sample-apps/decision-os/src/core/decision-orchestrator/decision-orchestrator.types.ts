export interface ClassifyDecisionArgs {
  request: string;
}

export interface CreateExecutionPlanArgs {
  objective: string;
  domains?: string[];
}

export interface ValidateExecutionPlanArgs {
  planId: string;
  steps: Array<{
    engineId: string;
    dependsOn?: string[];
    runInParallel?: boolean;
  }>;
}

export interface ExecuteDecisionPipelineArgs {
  request: string;
}

export interface AnalyzeDecisionArgs {
  request: string;
}
