/**
 * model-provider.interface.ts -- the seam between PlannerService's
 * provider-agnostic retry/validation loop and whichever vendor actually
 * answers the call. PlannerService only ever calls `.complete()`; it
 * neither knows nor cares which provider is behind it.
 *
 * Everything downstream of this (ToolSurfaceIRSchema validation,
 * validateAgainstGraph, the whole EMIT/VERIFY pipeline) is already
 * provider-agnostic -- it just consumes JSON matching a Zod schema. This
 * interface is the only place vendor-specific request/response shape
 * lives.
 */
export interface ModelProvider {
  /** Human-readable name for error messages / logs, e.g. "anthropic", "groq". */
  readonly name: string;

  /**
   * Send one turn: a system prompt + a user prompt, get back the raw text
   * response. No streaming, no tool-use blocks -- the planner asks for
   * plain JSON in the response text and parses it itself
   * (PlannerService.tryParseJson), so this stays maximally simple and
   * portable across vendors.
   */
  complete(systemPrompt: string, userPrompt: string): Promise<string>;
}
