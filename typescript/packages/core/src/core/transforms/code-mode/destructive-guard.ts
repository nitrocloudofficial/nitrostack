import { Tool } from '../../tool.js';

/**
 * Asserts that a target tool is permitted to execute according to safety policies.
 * Throws a model-legible safety error if a destructive tool is invoked while allowDestructive is false.
 */
export function assertToolAllowed(tool: Tool, allowDestructive: boolean): void {
  if (allowDestructive) return;

  // ToolAnnotations documents destructiveHint default true. A tool is safe to call
  // from Code Mode only when it opts out (destructiveHint: false) or is read-only.
  // A legacy `destructive` flag still blocks even if the annotation says otherwise.
  const readOnly = tool.annotations?.readOnlyHint === true;
  const explicitlySafe = tool.annotations?.destructiveHint === false;
  const legacyDestructive = Boolean((tool as { destructive?: boolean }).destructive);
  const isDestructive =
    legacyDestructive ||
    tool.annotations?.destructiveHint === true ||
    (!readOnly && !explicitlySafe);

  if (isDestructive) {
    throw new Error(
      `callTool('${tool.name}') rejected: destructive operations are disabled in Code Mode batch scripts. Set allowDestructive: true to enable.`
    );
  }
}
