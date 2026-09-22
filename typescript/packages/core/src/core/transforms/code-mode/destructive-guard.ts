import { Tool } from '../../tool.js';

/**
 * Asserts that a target tool is permitted to execute according to safety policies.
 * Throws a model-legible safety error if a destructive tool is invoked while allowDestructive is false.
 */
export function assertToolAllowed(tool: Tool, allowDestructive: boolean): void {
  // Check official MCP ToolAnnotations (destructiveHint) or legacy decorator property
  const isDestructive =
    tool.annotations?.destructiveHint === true ||
    Boolean((tool as any).destructive);

  if (isDestructive && !allowDestructive) {
    throw new Error(
      `callTool('${tool.name}') rejected: destructive operations are disabled in Code Mode batch scripts. Set allowDestructive: true to enable.`
    );
  }
}
