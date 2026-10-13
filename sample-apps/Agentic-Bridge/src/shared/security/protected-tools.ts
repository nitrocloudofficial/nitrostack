/**
 * The authorisation boundary, in one list.
 *
 * "Only the designated Admin Dashboard can alter workflow states or resolve
 * conflicts" is a statement about a specific set of operations, so that set is
 * written down once here and consumed by both enforcement points: the Express
 * middleware in front of the HTTP transport, and the per-tool guard that also
 * covers stdio.
 *
 * The test for membership is whether the call changes what the next agent will
 * believe or do — writing the manifest, overruling a source, minting a tool,
 * executing a pipeline. Reading the knowledge base is not on this list on
 * purpose: an agent that has to authenticate before it can ask a question is an
 * agent that will stop asking.
 */
export const PROTECTED_TOOLS = new Set<string>([
  // Rebuilds the knowledge base and can write CLAUDE.md.
  'run_swarm',
  // Writes the manifest every downstream Claude instance reads as its prompt.
  'synthesize_claude_md',
  // Records the authoritative human ruling — the highest-privilege call here.
  'resolve_conflict',
  // Writes conflict records that gate synthesis.
  'detect_conflicts',
  // Metaprogramming: writes TypeScript to disk and registers a live MCP tool.
  'generate_custom_skill',
  // Injects trusted context that outranks parsed inference.
  'ingest_manual_document',
  // Workflow state.
  'save_pipeline',
  // Can perform real side effects against a repository, CI, Jira and Slack.
  'run_pipeline',
  // Destructive.
  'reset_bridge',
]);

/** True when `tool` mutates bridge state and therefore requires a credential. */
export function isProtectedTool(tool: string | undefined): boolean {
  return !!tool && PROTECTED_TOOLS.has(tool);
}
