export interface GraphState {
  status: 'PENDING' | 'DIAGNOSING' | 'PATCHING' | 'PENDING_APPROVAL' | 'APPROVED' | 'VERIFYING' | 'COMPLETED' | 'FAILED';
  pipelineContext?: {
    repository_url: string;
    branch_name:    string;
    commit_sha:     string;
    failing_job_id: string;
    /** GitHub Actions workflow run ID — required by ci-mcp tools */
    run_id:         string;
    /** Repository owner / organisation — required by ci-mcp and git-mcp tools */
    owner:          string;
    /** Repository name — required by ci-mcp and git-mcp tools */
    repo:           string;
  };
  /**
   * Graph-grounded CI failure context returned by ci-mcp's get_ci_graphrag_context tool.
   * Contains: run metadata, failed jobs, steps, classified errors, changed files,
   * and heuristic-suggested fix targets.  LLM-ready text format.
   */
  ciGraphContext?:  string;
  /**
   * Files the GraphRAG heuristic identified as most likely to contain the bug.
   * Parsed from the "Suggested Files to Fix" section of ciGraphContext.
   */
  suggestedFiles?:  string[];
  /**
   * JSON-serialised error nodes from the graph (category, message, step_name).
   * Available for agents that need structured error data beyond the text summary.
   */
  ciErrors?:        string;
  jobLogs?:         string;
  traceId?:         string;
  traceSpans?:      string;
  domErrors?:       string;
  rcaSummary?:      string;
  patchDiff?:       string;
  slackThreadId?:   string;
  error?:           string;
}
