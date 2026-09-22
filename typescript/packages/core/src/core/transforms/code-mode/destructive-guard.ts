import { Tool } from '../../tool.js';

/**
 * Asserts that a target tool is permitted to execute according to safety policies.
 * Throws a model-legible safety error if a destructive tool is invoked while allowDestructive is false.
 */
export function assertToolAllowed(tool: Tool, allowDestructive: boolean): void {
  if (allowDestructive) return;

  // Block only an explicit destructive annotation or the legacy flag.
  // An omitted hint stays callable: catalogs that never set annotations would
  // otherwise be unable to run ordinary tools from a batch script.
  const legacyDestructive = Boolean((tool as { destructive?: boolean }).destructive);
  const isDestructive = legacyDestructive || tool.annotations?.destructiveHint === true;

  if (isDestructive) {
    throw new Error(
      `callTool('${tool.name}') rejected: destructive operations are disabled in Code Mode batch scripts. Set allowDestructive: true to enable.`
    );
  }
}
