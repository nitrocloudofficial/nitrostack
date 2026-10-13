export interface ExecutionPlanNode {
  engineId: string;
  dependsOn: string[];
  runInParallel: boolean;
}

export interface ExecutionPlan {
  planId: string;
  steps: ExecutionPlanNode[];
  isValid: boolean;
  errors?: string[];
}
