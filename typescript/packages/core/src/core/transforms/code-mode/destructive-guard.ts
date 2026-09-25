import { Tool } from '../../tool.js';

/**
 * Asserts that a target tool is permitted to execute according to safety policies.
 * Throws a model-legible safety error if a destructive tool is invoked while allowDestructive is false.
 */
export function assertToolAllowed(tool: Tool, allowDestructive: boolean): void {
  if (allowDestructive) return;

  // MCP default: omitted destructiveHint means the tool may destroy state.
  // readOnlyHint opts out. destructiveHint: false opts out explicitly.
  const legacyDestructive = Boolean((tool as { destructive?: boolean }).destructive);
  const hint = tool.annotations?.destructiveHint;
  const readOnly = tool.annotations?.readOnlyHint === true;
  const isDestructive = legacyDestructive || hint === true || (hint === undefined && !readOnly);

  if (isDestructive) {
    throw new Error(
      `callTool('${tool.name}') rejected: destructive operations are disabled in Code Mode batch scripts. Set allowDestructive: true to enable.`
    );
  }
}
